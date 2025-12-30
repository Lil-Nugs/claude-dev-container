"""Container service for Docker management."""

import os
import tempfile
import threading
from pathlib import Path
from typing import Any

import docker
from docker.errors import DockerException, NotFound

from app.config import settings
from app.models import CommandResult, ExecutionResult, ExecutionState, ProgressInfo


class ContainerService:
    """Service for managing Docker containers.

    This service wraps the Docker SDK to provide container lifecycle management
    for running Claude CLI in isolated environments.
    """

    # Default image for dev containers
    DEFAULT_IMAGE = "claude-dev-base:latest"

    def __init__(self, docker_socket: str | None = None) -> None:
        """Initialize the container service.

        Args:
            docker_socket: Path to Docker socket. Defaults to settings.docker_socket.
        """
        self.docker_socket = docker_socket or settings.docker_socket
        self._client: docker.DockerClient | None = None
        self._containers: dict[str, Any] = {}  # project_id -> container
        self._executions: dict[str, dict] = {}  # project_id -> execution info

    def get_client(self) -> docker.DockerClient:
        """Get or create Docker client.

        Returns:
            Docker client instance.

        Raises:
            DockerException: If Docker connection fails.
        """
        if self._client is None:
            self._client = docker.DockerClient(base_url=f"unix://{self.docker_socket}")
        return self._client

    def ensure_container(self, project_id: str, project_path: str) -> str:
        """Ensure a container exists for the project, create if needed.

        Args:
            project_id: Unique project identifier.
            project_path: Absolute path to the project directory.

        Returns:
            Container ID.

        Raises:
            DockerException: If container creation fails.
            ValueError: If project_path is empty or invalid.
        """
        if not project_path:
            raise ValueError("Project path required")

        # Check if we have a running container
        if project_id in self._containers:
            container = self._containers[project_id]
            try:
                container.reload()
                if container.status == "running":
                    return container.id
            except NotFound:
                # Container was removed externally
                del self._containers[project_id]

        # Create new container
        container = self._create_container(project_id, project_path)
        self._containers[project_id] = container
        return container.id

    def _create_container(self, project_id: str, project_path: str) -> Any:
        """Create a new container for the project.

        Args:
            project_id: Unique project identifier.
            project_path: Absolute path to the project directory.

        Returns:
            Docker container object.
        """
        client = self.get_client()

        # Set up volume mounts
        volumes = self._get_volume_mounts(project_path)

        # Create and start container
        container = client.containers.run(
            self.DEFAULT_IMAGE,
            detach=True,
            name=f"claude-dev-{project_id}",
            volumes=volumes,
            labels={
                "claude-dev": "true",
                "project": project_id,
            },
            user="claude",
            working_dir="/workspace",
            remove=False,  # Keep for debugging
        )

        return container

    def _get_volume_mounts(self, project_path: str) -> dict[str, dict]:
        """Get volume mount configuration for container.

        Args:
            project_path: Path to the project directory.

        Returns:
            Volume mount configuration dictionary.
        """
        home = Path.home()
        volumes = {
            # Project workspace
            project_path: {"bind": "/workspace", "mode": "rw"},
        }

        # Claude CLI - mount if exists
        claude_bin = Path("/usr/local/bin/claude")
        if claude_bin.exists():
            volumes[str(claude_bin)] = {"bind": "/usr/local/bin/claude", "mode": "ro"}

        # Claude config directory
        claude_config = home / ".claude"
        if claude_config.exists():
            volumes[str(claude_config)] = {"bind": "/home/claude/.claude", "mode": "rw"}

        # Git configuration
        gitconfig = home / ".gitconfig"
        if gitconfig.exists():
            volumes[str(gitconfig)] = {"bind": "/home/claude/.gitconfig", "mode": "ro"}

        # SSH keys for git operations
        ssh_dir = home / ".ssh"
        if ssh_dir.exists():
            volumes[str(ssh_dir)] = {"bind": "/home/claude/.ssh", "mode": "ro"}

        return volumes

    def exec_claude(self, project_id: str, prompt: str) -> ExecutionResult:
        """Execute Claude CLI in container.

        This method blocks until execution completes but writes output to a
        temporary file that can be polled via get_progress().

        Args:
            project_id: The project identifier.
            prompt: The prompt to send to Claude.

        Returns:
            ExecutionResult with output and state.

        Raises:
            KeyError: If no container exists for project.
        """
        if project_id not in self._containers:
            raise KeyError(f"No container for project: {project_id}")

        container = self._containers[project_id]
        output_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log")
        done_event = threading.Event()
        result: dict[str, Any] = {"exit_code": None}

        def run_claude() -> None:
            """Background thread to run Claude and capture output."""
            nonlocal result
            try:
                # Create exec instance
                exec_id = container.client.api.exec_create(
                    container.id,
                    cmd=["claude", "--dangerously-skip-permissions", "-p", prompt],
                    workdir="/workspace",
                    user="claude",
                )

                # Start execution with streaming
                output_gen = container.client.api.exec_start(exec_id, stream=True)

                # Stream output to file
                for chunk in output_gen:
                    if chunk:
                        output_file.write(chunk.decode("utf-8", errors="replace"))
                        output_file.flush()

                output_file.close()

                # Get exit code
                inspect = container.client.api.exec_inspect(exec_id)
                result["exit_code"] = inspect.get("ExitCode", 1)
            except Exception as e:
                output_file.write(f"\nError: {e}\n")
                output_file.close()
                result["exit_code"] = 1
            finally:
                done_event.set()

        # Start execution in background thread
        thread = threading.Thread(target=run_claude)
        thread.start()

        # Store execution info for progress polling
        self._executions[project_id] = {
            "thread": thread,
            "output_file": output_file.name,
            "done": done_event,
            "result": result,
        }

        # Block until complete
        thread.join()

        # Read final output
        with open(output_file.name) as f:
            output = f.read()

        exit_code = result["exit_code"] or 0

        # Determine execution state
        state = self._determine_state(exit_code, output)

        # Cleanup
        try:
            os.unlink(output_file.name)
        except OSError:
            pass
        del self._executions[project_id]

        return ExecutionResult(
            output=output,
            state=state,
            exit_code=exit_code,
        )

    def _determine_state(self, exit_code: int, output: str) -> ExecutionState:
        """Determine execution state from exit code and output.

        Args:
            exit_code: Process exit code.
            output: Command output.

        Returns:
            ExecutionState enum value.
        """
        if exit_code == 0:
            return ExecutionState.completed
        elif exit_code == 1 and "BLOCKED:" in output:
            return ExecutionState.blocked
        elif exit_code == 130:  # SIGINT - cancelled
            return ExecutionState.cancelled
        else:
            return ExecutionState.failed

    def get_progress(self, project_id: str) -> ProgressInfo:
        """Get current progress of running execution.

        Args:
            project_id: The project identifier.

        Returns:
            ProgressInfo with current output and status.
        """
        if project_id not in self._executions:
            return ProgressInfo(
                running=False,
                output="",
                recent="",
                bytes=0,
            )

        exec_info = self._executions[project_id]
        try:
            with open(exec_info["output_file"]) as f:
                output = f.read()
        except (OSError, FileNotFoundError):
            output = ""

        # Get last ~10 lines for quick preview
        lines = output.strip().split("\n")
        recent = "\n".join(lines[-10:]) if len(lines) > 10 else output

        return ProgressInfo(
            running=not exec_info["done"].is_set(),
            output=output,
            recent=recent,
            bytes=len(output),
        )

    def exec_command(self, project_id: str, command: str) -> CommandResult:
        """Execute a simple command in the container.

        Args:
            project_id: The project identifier.
            command: Shell command to execute.

        Returns:
            CommandResult with exit_code and output.

        Raises:
            KeyError: If no container exists for project.
        """
        if project_id not in self._containers:
            raise KeyError(f"No container for project: {project_id}")

        container = self._containers[project_id]
        exit_code, output = container.exec_run(
            cmd=["bash", "-c", command],
            workdir="/workspace",
            user="claude",
        )

        return CommandResult(
            exit_code=exit_code,
            output=output.decode("utf-8", errors="replace"),
        )

    def get_container_id(self, project_id: str) -> str | None:
        """Get container ID for a project.

        Args:
            project_id: The project identifier.

        Returns:
            Container ID if exists, None otherwise.
        """
        if project_id in self._containers:
            return self._containers[project_id].id
        return None

    def stop_container(self, project_id: str) -> bool:
        """Stop a running container.

        Args:
            project_id: The project identifier.

        Returns:
            True if stopped successfully, False otherwise.
        """
        if project_id not in self._containers:
            return False

        try:
            container = self._containers[project_id]
            container.stop(timeout=10)
            return True
        except DockerException:
            return False

    def remove_container(self, project_id: str) -> bool:
        """Remove a container.

        Args:
            project_id: The project identifier.

        Returns:
            True if removed successfully, False otherwise.
        """
        if project_id not in self._containers:
            return False

        try:
            container = self._containers[project_id]
            container.remove(force=True)
            del self._containers[project_id]
            return True
        except DockerException:
            return False
