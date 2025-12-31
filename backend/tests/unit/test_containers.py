"""Unit tests for container manager service."""

import threading
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from app.models import CommandResult, ExecutionState
from app.services.containers import ContainerService


class TestContainerService:
    """Tests for ContainerService."""

    @pytest.fixture
    def service(self) -> ContainerService:
        """Create ContainerService instance with mocked Docker client."""
        return ContainerService(docker_socket="/var/run/docker.sock")

    @pytest.fixture
    def mock_docker_client(self):
        """Create a mock Docker client."""
        with patch("app.services.containers.docker.DockerClient") as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def mock_container(self):
        """Create a mock container."""
        container = Mock()
        container.id = "abc123456789"
        container.status = "running"
        return container

    # =========================================================================
    # Test get_client
    # =========================================================================

    def test_get_client_creates_docker_client(
        self, service: ContainerService, mock_docker_client: Mock
    ) -> None:
        """Getting client creates Docker client with correct socket."""
        client = service.get_client()

        assert client is mock_docker_client

    def test_get_client_caches_client(
        self, service: ContainerService, mock_docker_client: Mock
    ) -> None:
        """Getting client multiple times returns same instance."""
        client1 = service.get_client()
        client2 = service.get_client()

        assert client1 is client2

    # =========================================================================
    # Test ensure_container
    # =========================================================================

    def test_ensure_container_creates_new_container(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Ensuring container creates one when none exists."""
        mock_docker_client.containers.run.return_value = mock_container

        container_id = service.ensure_container("test-project", "/path/to/project")

        assert container_id == mock_container.id
        mock_docker_client.containers.run.assert_called_once()

    def test_ensure_container_returns_existing_if_running(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Ensuring container returns existing if already running."""
        mock_docker_client.containers.run.return_value = mock_container
        mock_container.status = "running"

        # First call creates container
        service.ensure_container("test-project", "/path/to/project")
        # Second call should return existing
        container_id = service.ensure_container("test-project", "/path/to/project")

        assert container_id == mock_container.id
        # Should only create once
        assert mock_docker_client.containers.run.call_count == 1

    def test_ensure_container_recreates_if_stopped(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Ensuring container recreates if existing is stopped."""
        mock_docker_client.containers.run.return_value = mock_container
        mock_container.status = "exited"

        # First call creates container
        service.ensure_container("test-project", "/path/to/project")

        # Simulate container stopped
        mock_container.status = "exited"
        mock_container.reload.return_value = None

        # Create a new container for the second call
        new_container = Mock()
        new_container.id = "new123"
        new_container.status = "running"
        mock_docker_client.containers.run.return_value = new_container

        container_id = service.ensure_container("test-project", "/path/to/project")

        assert container_id == "new123"

    def test_ensure_container_raises_on_empty_path(
        self, service: ContainerService
    ) -> None:
        """Ensuring container raises ValueError for empty path."""
        with pytest.raises(ValueError, match="Project path required"):
            service.ensure_container("test-project", "")

    def test_ensure_container_sets_correct_labels(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Ensuring container sets correct Docker labels."""
        mock_docker_client.containers.run.return_value = mock_container

        service.ensure_container("my-project", "/path/to/project")

        call_kwargs = mock_docker_client.containers.run.call_args[1]
        assert call_kwargs["labels"]["claude-dev"] == "true"
        assert call_kwargs["labels"]["project"] == "my-project"

    def test_ensure_container_mounts_workspace(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Ensuring container mounts project path to /workspace."""
        mock_docker_client.containers.run.return_value = mock_container

        service.ensure_container("test-project", "/path/to/project")

        call_kwargs = mock_docker_client.containers.run.call_args[1]
        assert "/path/to/project" in call_kwargs["volumes"]
        assert call_kwargs["volumes"]["/path/to/project"]["bind"] == "/workspace"

    # =========================================================================
    # Test _get_volume_mounts
    # =========================================================================

    def test_get_volume_mounts_includes_workspace(
        self, service: ContainerService
    ) -> None:
        """Volume mounts include project workspace."""
        volumes = service._get_volume_mounts("/path/to/project")

        assert "/path/to/project" in volumes
        assert volumes["/path/to/project"]["bind"] == "/workspace"
        assert volumes["/path/to/project"]["mode"] == "rw"

    def test_get_volume_mounts_includes_claude_cli_if_exists(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts include Claude CLI if it exists."""
        with patch.object(Path, "exists", return_value=True):
            volumes = service._get_volume_mounts("/path/to/project")

        # Check if claude binary would be mounted (when it exists)
        claude_path = "/usr/local/bin/claude"
        if claude_path in volumes:
            assert volumes[claude_path]["mode"] == "ro"

    def test_get_volume_mounts_finds_claude_in_local_bin(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts find Claude CLI in ~/.local/bin when not in /usr/local/bin."""
        # Create ~/.local/bin/claude in tmp_path
        local_bin_claude = tmp_path / ".local" / "bin" / "claude"
        local_bin_claude.parent.mkdir(parents=True)
        local_bin_claude.touch()

        with patch("pathlib.Path.home", return_value=tmp_path):
            volumes = service._get_volume_mounts("/path/to/project")

        # Should mount the ~/.local/bin/claude path
        assert str(local_bin_claude) in volumes
        assert volumes[str(local_bin_claude)]["bind"] == "/usr/local/bin/claude"
        assert volumes[str(local_bin_claude)]["mode"] == "ro"
        # /usr/local/bin/claude should NOT be in volumes (doesn't exist)
        assert "/usr/local/bin/claude" not in volumes

    def test_get_volume_mounts_prefers_usr_local_bin_claude(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts prefer /usr/local/bin/claude over ~/.local/bin/claude."""
        # Create ~/.local/bin/claude in tmp_path
        local_bin_claude = tmp_path / ".local" / "bin" / "claude"
        local_bin_claude.parent.mkdir(parents=True)
        local_bin_claude.touch()

        # Mock /usr/local/bin/claude to exist
        original_exists = Path.exists

        def mock_exists(self):
            if str(self) == "/usr/local/bin/claude":
                return True
            return original_exists(self)

        with patch("pathlib.Path.home", return_value=tmp_path):
            with patch.object(Path, "exists", mock_exists):
                volumes = service._get_volume_mounts("/path/to/project")

        # Should mount /usr/local/bin/claude, NOT ~/.local/bin/claude
        assert "/usr/local/bin/claude" in volumes
        assert volumes["/usr/local/bin/claude"]["bind"] == "/usr/local/bin/claude"
        assert volumes["/usr/local/bin/claude"]["mode"] == "ro"
        # ~/.local/bin/claude should NOT be mounted
        assert str(local_bin_claude) not in volumes

    def test_get_volume_mounts_includes_claude_config_if_exists(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts include ~/.claude config directory if it exists."""
        home = Path.home()
        claude_config = home / ".claude"

        with patch.object(Path, "exists", side_effect=lambda: True):
            volumes = service._get_volume_mounts("/path/to/project")

        if str(claude_config) in volumes:
            assert volumes[str(claude_config)]["bind"] == "/home/claude/.claude"
            assert volumes[str(claude_config)]["mode"] == "rw"

    def test_get_volume_mounts_includes_gitconfig_if_exists(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts include ~/.gitconfig if it exists."""
        # Create a mock gitconfig file
        mock_gitconfig = tmp_path / ".gitconfig"
        mock_gitconfig.touch()

        with patch("pathlib.Path.home", return_value=tmp_path):
            volumes = service._get_volume_mounts("/path/to/project")

        assert str(mock_gitconfig) in volumes
        assert volumes[str(mock_gitconfig)]["bind"] == "/home/claude/.gitconfig"
        assert volumes[str(mock_gitconfig)]["mode"] == "ro"

    def test_get_volume_mounts_includes_ssh_if_exists(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts include ~/.ssh directory if it exists."""
        # Create a mock .ssh directory
        mock_ssh = tmp_path / ".ssh"
        mock_ssh.mkdir()

        with patch("pathlib.Path.home", return_value=tmp_path):
            volumes = service._get_volume_mounts("/path/to/project")

        assert str(mock_ssh) in volumes
        assert volumes[str(mock_ssh)]["bind"] == "/home/claude/.ssh"
        assert volumes[str(mock_ssh)]["mode"] == "ro"

    def test_get_volume_mounts_skips_missing_optional_mounts(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Volume mounts skip optional files/directories that don't exist."""
        # Use empty tmp_path as home - nothing exists
        with patch("pathlib.Path.home", return_value=tmp_path):
            volumes = service._get_volume_mounts("/path/to/project")

        # Should only have workspace mount
        assert "/path/to/project" in volumes
        # Optional mounts should not be present
        assert str(tmp_path / ".gitconfig") not in volumes
        assert str(tmp_path / ".ssh") not in volumes
        assert str(tmp_path / ".claude") not in volumes

    # =========================================================================
    # Test exec_claude
    # =========================================================================

    def test_exec_claude_raises_if_no_container(
        self, service: ContainerService
    ) -> None:
        """Executing Claude raises KeyError if no container exists."""
        with pytest.raises(KeyError, match="No container"):
            service.exec_claude("nonexistent", "test prompt")

    def test_exec_claude_returns_execution_result(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing Claude returns ExecutionResult with output."""
        # Set up container
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        # Mock exec_create and exec_start
        mock_container.client = Mock()
        mock_container.client.api.exec_create.return_value = {"Id": "exec123"}
        mock_container.client.api.exec_start.return_value = iter([b"test output"])
        mock_container.client.api.exec_inspect.return_value = {"ExitCode": 0}

        result = service.exec_claude("test-project", "test prompt")

        assert result.output == "test output"
        assert result.state == ExecutionState.completed
        assert result.exit_code == 0

    def test_exec_claude_detects_blocked_state(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing Claude detects BLOCKED state from output."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        mock_container.client = Mock()
        mock_container.client.api.exec_create.return_value = {"Id": "exec123"}
        mock_container.client.api.exec_start.return_value = iter(
            [b"BLOCKED: waiting for input"]
        )
        mock_container.client.api.exec_inspect.return_value = {"ExitCode": 1}

        result = service.exec_claude("test-project", "test prompt")

        assert result.state == ExecutionState.blocked

    def test_exec_claude_detects_cancelled_state(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing Claude detects cancelled state from SIGINT."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        mock_container.client = Mock()
        mock_container.client.api.exec_create.return_value = {"Id": "exec123"}
        mock_container.client.api.exec_start.return_value = iter([b"cancelled"])
        mock_container.client.api.exec_inspect.return_value = {"ExitCode": 130}

        result = service.exec_claude("test-project", "test prompt")

        assert result.state == ExecutionState.cancelled

    def test_exec_claude_detects_failed_state(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing Claude detects failed state from non-zero exit."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        mock_container.client = Mock()
        mock_container.client.api.exec_create.return_value = {"Id": "exec123"}
        mock_container.client.api.exec_start.return_value = iter([b"error occurred"])
        mock_container.client.api.exec_inspect.return_value = {"ExitCode": 1}

        result = service.exec_claude("test-project", "test prompt")

        assert result.state == ExecutionState.failed

    # =========================================================================
    # Test _determine_state
    # =========================================================================

    def test_determine_state_completed(self, service: ContainerService) -> None:
        """Exit code 0 results in completed state."""
        state = service._determine_state(0, "success")
        assert state == ExecutionState.completed

    def test_determine_state_blocked(self, service: ContainerService) -> None:
        """Exit code 1 with BLOCKED in output results in blocked state."""
        state = service._determine_state(1, "BLOCKED: waiting for approval")
        assert state == ExecutionState.blocked

    def test_determine_state_cancelled(self, service: ContainerService) -> None:
        """Exit code 130 (SIGINT) results in cancelled state."""
        state = service._determine_state(130, "interrupted")
        assert state == ExecutionState.cancelled

    def test_determine_state_failed(self, service: ContainerService) -> None:
        """Other non-zero exit codes result in failed state."""
        state = service._determine_state(1, "error without BLOCKED")
        assert state == ExecutionState.failed

    # =========================================================================
    # Test get_progress
    # =========================================================================

    def test_get_progress_no_execution(self, service: ContainerService) -> None:
        """Getting progress with no execution returns empty ProgressInfo."""
        progress = service.get_progress("nonexistent")

        assert progress.running is False
        assert progress.output == ""
        assert progress.bytes == 0

    def test_get_progress_returns_current_output(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Getting progress returns current output from file."""
        # Create a mock output file
        output_file = tmp_path / "output.log"
        output_file.write_text("line1\nline2\nline3")

        # Set up mock execution
        done_event = threading.Event()
        service._executions["test-project"] = {
            "output_file": str(output_file),
            "done": done_event,
        }

        progress = service.get_progress("test-project")

        assert progress.running is True
        assert "line1" in progress.output
        assert progress.bytes > 0

    def test_get_progress_returns_recent_lines(
        self, service: ContainerService, tmp_path: Path
    ) -> None:
        """Getting progress returns last 10 lines as recent."""
        # Create output with many lines
        output_file = tmp_path / "output.log"
        lines = [f"line{i}" for i in range(20)]
        output_file.write_text("\n".join(lines))

        done_event = threading.Event()
        service._executions["test-project"] = {
            "output_file": str(output_file),
            "done": done_event,
        }

        progress = service.get_progress("test-project")

        # Recent should contain last 10 lines
        assert "line19" in progress.recent
        assert "line10" in progress.recent
        assert "line0" not in progress.recent

    # =========================================================================
    # Test exec_command
    # =========================================================================

    def test_exec_command_raises_if_no_container(
        self, service: ContainerService
    ) -> None:
        """Executing command raises KeyError if no container exists."""
        with pytest.raises(KeyError, match="No container"):
            service.exec_command("nonexistent", "ls -la")

    def test_exec_command_returns_command_result(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing command returns CommandResult with exit_code and output."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        mock_container.exec_run.return_value = (0, b"command output")

        result = service.exec_command("test-project", "echo hello")

        assert isinstance(result, CommandResult)
        assert result.exit_code == 0
        assert result.output == "command output"
        mock_container.exec_run.assert_called_once()

    def test_exec_command_returns_non_zero_exit_code(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Executing command returns non-zero exit code on failure."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        mock_container.exec_run.return_value = (1, b"error: command failed")

        result = service.exec_command("test-project", "exit 1")

        assert isinstance(result, CommandResult)
        assert result.exit_code == 1
        assert result.output == "error: command failed"

    # =========================================================================
    # Test get_container_id
    # =========================================================================

    def test_get_container_id_returns_none_if_not_exists(
        self, service: ContainerService
    ) -> None:
        """Getting container ID returns None if no container exists."""
        result = service.get_container_id("nonexistent")
        assert result is None

    def test_get_container_id_returns_id(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Getting container ID returns container ID."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        result = service.get_container_id("test-project")

        assert result == mock_container.id

    # =========================================================================
    # Test stop_container
    # =========================================================================

    def test_stop_container_returns_false_if_not_exists(
        self, service: ContainerService
    ) -> None:
        """Stopping container returns False if no container exists."""
        result = service.stop_container("nonexistent")
        assert result is False

    def test_stop_container_stops_and_returns_true(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Stopping container calls stop and returns True."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        result = service.stop_container("test-project")

        assert result is True
        mock_container.stop.assert_called_once_with(timeout=10)

    # =========================================================================
    # Test remove_container
    # =========================================================================

    def test_remove_container_returns_false_if_not_exists(
        self, service: ContainerService
    ) -> None:
        """Removing container returns False if no container exists."""
        result = service.remove_container("nonexistent")
        assert result is False

    def test_remove_container_removes_and_returns_true(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Removing container calls remove and returns True."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        result = service.remove_container("test-project")

        assert result is True
        mock_container.remove.assert_called_once_with(force=True)

    def test_remove_container_clears_from_cache(
        self,
        service: ContainerService,
        mock_docker_client: Mock,
        mock_container: Mock,
    ) -> None:
        """Removing container clears it from internal cache."""
        mock_docker_client.containers.run.return_value = mock_container
        service.ensure_container("test-project", "/path/to/project")

        service.remove_container("test-project")

        assert service.get_container_id("test-project") is None
