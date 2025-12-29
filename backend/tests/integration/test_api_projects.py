"""Integration tests for project API endpoints."""

from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestProjectsAPI:
    """Integration tests for /api/projects endpoints."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_workspace(self, tmp_path: Path) -> Path:
        """Create a mock workspace with test projects."""
        # Project with beads
        project_with_beads = tmp_path / "project-with-beads"
        (project_with_beads / ".git").mkdir(parents=True)
        (project_with_beads / ".beads").mkdir()

        # Project without beads
        project_no_beads = tmp_path / "project-no-beads"
        (project_no_beads / ".git").mkdir(parents=True)

        return tmp_path

    # =========================================================================
    # GET /api/projects
    # =========================================================================

    @pytest.mark.smoke
    def test_list_projects_returns_200(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects returns 200 OK."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects")

        assert response.status_code == 200

    def test_list_projects_returns_list(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects returns a list of projects."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects")

        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_list_projects_includes_beads_info(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects includes has_beads for each project."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects")

        data = response.json()
        projects_by_id = {p["id"]: p for p in data}

        assert projects_by_id["project-with-beads"]["has_beads"] is True
        assert projects_by_id["project-no-beads"]["has_beads"] is False

    def test_list_projects_sorted_alphabetically(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects returns projects sorted by name."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects")

        data = response.json()
        names = [p["name"] for p in data]
        assert names == sorted(names)

    def test_list_projects_empty_workspace(
        self, client: TestClient, tmp_path: Path
    ) -> None:
        """GET /api/projects returns empty list for empty workspace."""
        empty_workspace = tmp_path / "empty"
        empty_workspace.mkdir()

        with patch("app.main.project_service.workspace_path", empty_workspace):
            response = client.get("/api/projects")

        assert response.status_code == 200
        assert response.json() == []

    # =========================================================================
    # GET /api/projects/{project_id}
    # =========================================================================

    @pytest.mark.smoke
    def test_get_project_returns_200(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id} returns 200 for existing project."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/project-with-beads")

        assert response.status_code == 200

    def test_get_project_returns_project_data(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id} returns project details."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/project-with-beads")

        data = response.json()
        assert data["id"] == "project-with-beads"
        assert data["name"] == "project-with-beads"
        assert "path" in data
        assert data["has_beads"] is True

    def test_get_project_not_found(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id} returns 404 for nonexistent project."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/nonexistent-project")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_project_without_beads(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id} shows has_beads=False when not initialized."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/project-no-beads")

        data = response.json()
        assert data["has_beads"] is False
