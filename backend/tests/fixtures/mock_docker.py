"""Mock Docker client for testing."""

from typing import Any
from unittest.mock import MagicMock


def create_mock_docker_client() -> MagicMock:
    """Create a mock Docker client for testing.

    Returns:
        MagicMock configured to behave like docker.from_env()
    """
    mock_client = MagicMock()

    # Mock container
    mock_container = MagicMock()
    mock_container.id = "mock-container-123"
    mock_container.status = "running"
    mock_container.reload = MagicMock()

    # Mock containers.run
    mock_client.containers.run.return_value = mock_container

    # Mock containers.get
    mock_client.containers.get.return_value = mock_container

    # Mock containers.list
    mock_client.containers.list.return_value = [mock_container]

    return mock_client


def create_mock_exec_result(
    exit_code: int = 0,
    output: str = "Command executed successfully",
) -> dict[str, Any]:
    """Create a mock execution result.

    Args:
        exit_code: Exit code to return
        output: Output string to return

    Returns:
        Dict matching ExecutionResult structure
    """
    state = "completed" if exit_code == 0 else "failed"
    if exit_code == 1 and "BLOCKED:" in output:
        state = "blocked"

    return {
        "output": output,
        "state": state,
        "exit_code": exit_code,
    }
