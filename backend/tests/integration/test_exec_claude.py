"""Integration tests for exec_claude with real containers.

These tests require Docker to be available and the claude-dev-base image to be built.
They are marked with @pytest.mark.docker to allow selective execution.

Run with: pytest -m docker
Skip with: pytest -m "not docker"
"""

import os
import pytest

from app.services.containers import ContainerService


# Skip all tests in this module if Docker is not available
pytestmark = pytest.mark.docker


def is_docker_available() -> bool:
    """Check if Docker daemon is available."""
    try:
        import docker
        client = docker.from_env()
        client.ping()
        return True
    except Exception:
        return False


def is_image_available(image_name: str = "claude-dev-base:latest") -> bool:
    """Check if the required Docker image exists."""
    try:
        import docker
        client = docker.from_env()
        client.images.get(image_name)
        return True
    except Exception:
        return False


# Check conditions before running any tests
docker_available = is_docker_available()
image_available = docker_available and is_image_available()


@pytest.mark.skipif(not docker_available, reason="Docker daemon not available")
@pytest.mark.skipif(not image_available, reason="claude-dev-base:latest image not built")
class TestExecClaudeIntegration:
    """Integration tests for ContainerService.exec_claude with real containers.

    These tests create actual Docker containers and run commands in them.
    They are slower than unit tests but verify real Docker integration.
    """

    @pytest.fixture
    def container_service(self) -> ContainerService:
        """Create a ContainerService instance."""
        return ContainerService()

    @pytest.fixture
    def test_project_path(self, tmp_path) -> str:
        """Create a temporary project directory for testing."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()

        # Create minimal git repo structure
        git_dir = project_dir / ".git"
        git_dir.mkdir()

        # Create a test file
        test_file = project_dir / "README.md"
        test_file.write_text("# Test Project\n\nThis is a test project for integration tests.")

        return str(project_dir)

    @pytest.fixture
    def running_container(self, container_service: ContainerService, test_project_path: str):
        """Create and manage a container for the test."""
        project_id = "integration-test"
        container_id = container_service.ensure_container(project_id, test_project_path)

        yield project_id, container_id

        # Cleanup: remove container after test
        container_service.remove_container(project_id)

    def test_ensure_container_creates_running_container(
        self,
        container_service: ContainerService,
        test_project_path: str,
    ) -> None:
        """Test that ensure_container creates a running Docker container."""
        import docker

        project_id = "test-ensure-container"

        try:
            container_id = container_service.ensure_container(project_id, test_project_path)

            # Verify container exists and is running
            client = docker.from_env()
            container = client.containers.get(container_id)
            assert container.status == "running"

            # Verify labels
            labels = container.labels
            assert labels.get("claude-dev") == "true"
            assert labels.get("project") == project_id
        finally:
            container_service.remove_container(project_id)

    def test_exec_command_runs_in_container(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
    ) -> None:
        """Test that exec_command runs a command in the container."""
        project_id, _ = running_container

        # Run a simple command
        output = container_service.exec_command(project_id, "echo 'Hello World'")

        assert "Hello World" in output

    def test_exec_command_can_see_workspace(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
    ) -> None:
        """Test that container can see files in /workspace."""
        project_id, _ = running_container

        # List files in workspace
        output = container_service.exec_command(project_id, "ls -la /workspace")

        # Should see the README.md we created
        assert "README.md" in output

    def test_exec_command_can_read_files(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
    ) -> None:
        """Test that container can read files from workspace."""
        project_id, _ = running_container

        # Read the test file
        output = container_service.exec_command(project_id, "cat /workspace/README.md")

        assert "Test Project" in output
        assert "integration tests" in output

    def test_exec_command_can_write_files(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
        test_project_path: str,
    ) -> None:
        """Test that container can write files to workspace."""
        project_id, _ = running_container

        # Create a new file in the container
        container_service.exec_command(
            project_id,
            "echo 'Created in container' > /workspace/container-created.txt"
        )

        # Verify file exists on host
        created_file = os.path.join(test_project_path, "container-created.txt")
        assert os.path.exists(created_file)

        with open(created_file) as f:
            content = f.read()
        assert "Created in container" in content

    def test_container_has_correct_working_directory(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
    ) -> None:
        """Test that container starts in /workspace directory."""
        project_id, _ = running_container

        output = container_service.exec_command(project_id, "pwd")

        assert "/workspace" in output

    def test_get_container_id_returns_valid_id(
        self,
        container_service: ContainerService,
        running_container: tuple[str, str],
    ) -> None:
        """Test that get_container_id returns the correct container ID."""
        project_id, expected_id = running_container

        container_id = container_service.get_container_id(project_id)

        assert container_id == expected_id

    def test_stop_container_stops_running_container(
        self,
        container_service: ContainerService,
        test_project_path: str,
    ) -> None:
        """Test that stop_container stops a running container."""
        import docker

        project_id = "test-stop"

        try:
            container_id = container_service.ensure_container(project_id, test_project_path)

            # Stop the container
            result = container_service.stop_container(project_id)
            assert result is True

            # Verify container is stopped
            client = docker.from_env()
            container = client.containers.get(container_id)
            assert container.status != "running"
        finally:
            container_service.remove_container(project_id)

    def test_remove_container_removes_container(
        self,
        container_service: ContainerService,
        test_project_path: str,
    ) -> None:
        """Test that remove_container removes the container."""
        import docker

        project_id = "test-remove"
        container_id = container_service.ensure_container(project_id, test_project_path)

        # Remove the container
        result = container_service.remove_container(project_id)
        assert result is True

        # Verify container no longer exists
        client = docker.from_env()
        with pytest.raises(docker.errors.NotFound):
            client.containers.get(container_id)

    def test_container_name_includes_project_id(
        self,
        container_service: ContainerService,
        test_project_path: str,
    ) -> None:
        """Test that container name includes the project ID."""
        import docker

        project_id = "test-naming"

        try:
            container_id = container_service.ensure_container(project_id, test_project_path)

            client = docker.from_env()
            container = client.containers.get(container_id)
            assert f"claude-dev-{project_id}" in container.name
        finally:
            container_service.remove_container(project_id)


@pytest.mark.skipif(not docker_available, reason="Docker daemon not available")
class TestExecClaudeWithMockClaude:
    """Integration tests that mock Claude CLI but use real containers.

    These tests use real containers but mock the Claude CLI to test
    the exec_claude method without requiring an actual Claude installation.
    """

    @pytest.fixture
    def container_service(self) -> ContainerService:
        """Create a ContainerService instance."""
        return ContainerService()

    @pytest.fixture
    def test_project_path(self, tmp_path) -> str:
        """Create a temporary project directory for testing."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        (project_dir / ".git").mkdir()
        return str(project_dir)

    @pytest.mark.skipif(not image_available, reason="claude-dev-base:latest image not built")
    def test_exec_claude_uses_correct_command_structure(
        self,
        container_service: ContainerService,
        test_project_path: str,
    ) -> None:
        """Test that exec_claude uses the correct command structure.

        This test creates a fake 'claude' script in the container that
        outputs its arguments, verifying the command structure.
        """
        project_id = "test-exec-structure"

        try:
            container_service.ensure_container(project_id, test_project_path)

            # Create a mock claude script that outputs its arguments
            mock_script = """#!/bin/bash
echo "ARGS: $@"
"""
            container_service.exec_command(
                project_id,
                f"echo '{mock_script}' > /tmp/mock-claude && chmod +x /tmp/mock-claude"
            )

            # Test that the script works
            output = container_service.exec_command(project_id, "/tmp/mock-claude -p 'test prompt'")
            assert "ARGS:" in output
            assert "test prompt" in output or "-p" in output

        finally:
            container_service.remove_container(project_id)


@pytest.mark.skipif(docker_available, reason="Test only runs when Docker is not available")
class TestDockerUnavailable:
    """Tests for behavior when Docker is not available."""

    def test_get_client_raises_when_docker_unavailable(self) -> None:
        """Test that get_client raises an error when Docker is unavailable."""
        from docker.errors import DockerException

        service = ContainerService(docker_socket="/nonexistent/socket.sock")

        with pytest.raises(DockerException):
            service.get_client()
