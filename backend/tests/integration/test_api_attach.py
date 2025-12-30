"""Integration tests for attach endpoint."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestAttachAPI:
    """Integration tests for GET /api/projects/{project_id}/attach endpoint."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_project(self):
        """Mock project for testing."""
        return Mock(
            id="test-project",
            name="test-project",
            path="/path/to/project",
            has_beads=True,
        )

    @pytest.fixture
    def mock_container_id(self):
        """Mock container ID."""
        return "abc123def456789012345678901234567890"

    def test_attach_returns_container_info(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_container_id: str,
    ) -> None:
        """GET /api/projects/{id}/attach returns container ID and command."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_container_id",
                return_value=mock_container_id,
            ):
                response = client.get("/api/projects/test-project/attach")

        assert response.status_code == 200
        data = response.json()
        assert data["container_id"] == mock_container_id
        assert "docker exec -it" in data["command"]
        assert mock_container_id[:12] in data["command"]

    def test_attach_returns_404_when_project_not_found(
        self,
        client: TestClient,
    ) -> None:
        """GET /api/projects/{id}/attach returns 404 when project doesn't exist."""
        with patch("app.main.project_service.get_project", return_value=None):
            response = client.get("/api/projects/nonexistent/attach")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_attach_returns_404_when_container_not_running(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """GET /api/projects/{id}/attach returns 404 when container not running."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_container_id",
                return_value=None,
            ):
                response = client.get("/api/projects/test-project/attach")

        assert response.status_code == 404
        assert "Container not running" in response.json()["detail"]

    def test_attach_command_uses_truncated_container_id(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """GET /api/projects/{id}/attach uses truncated container ID."""
        long_container_id = "a" * 64  # Full SHA256 container ID

        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_container_id",
                return_value=long_container_id,
            ):
                response = client.get("/api/projects/test-project/attach")

        assert response.status_code == 200
        data = response.json()
        # Command should use first 12 chars
        assert data["command"] == f"docker exec -it {long_container_id[:12]} bash"
        # But full ID should be in container_id field
        assert data["container_id"] == long_container_id

    def test_attach_includes_bash_in_command(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_container_id: str,
    ) -> None:
        """GET /api/projects/{id}/attach command includes bash shell."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_container_id",
                return_value=mock_container_id,
            ):
                response = client.get("/api/projects/test-project/attach")

        assert response.status_code == 200
        assert response.json()["command"].endswith("bash")
