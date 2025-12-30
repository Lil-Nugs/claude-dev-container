"""Integration tests for beads API endpoints."""

from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestBeadsAPI:
    """Integration tests for /api/projects/{id}/beads endpoint."""

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

    @pytest.fixture
    def mock_bd_list_output(self) -> str:
        """Sample bd list output for mocking."""
        return """[P1] [open] [task] proj-001: First task
[P2] [in_progress] [bug] proj-002: Fix something
[P0] [open] [feature] proj-003: New feature"""

    # =========================================================================
    # GET /api/projects/{project_id}/beads
    # =========================================================================

    @pytest.mark.smoke
    def test_list_beads_returns_200(
        self, client: TestClient, mock_workspace: Path, mock_bd_list_output: str
    ) -> None:
        """GET /api/projects/{id}/beads returns 200 for project with beads."""
        mock_result = Mock(returncode=0, stdout=mock_bd_list_output, stderr="")

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get("/api/projects/project-with-beads/beads")

        assert response.status_code == 200

    def test_list_beads_returns_list(
        self, client: TestClient, mock_workspace: Path, mock_bd_list_output: str
    ) -> None:
        """GET /api/projects/{id}/beads returns list of beads."""
        mock_result = Mock(returncode=0, stdout=mock_bd_list_output, stderr="")

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get("/api/projects/project-with-beads/beads")

        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

    def test_list_beads_includes_bead_fields(
        self, client: TestClient, mock_workspace: Path, mock_bd_list_output: str
    ) -> None:
        """GET /api/projects/{id}/beads returns beads with required fields."""
        mock_result = Mock(returncode=0, stdout=mock_bd_list_output, stderr="")

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get("/api/projects/project-with-beads/beads")

        data = response.json()
        bead = data[0]
        assert "id" in bead
        assert "title" in bead
        assert "status" in bead
        assert "priority" in bead
        assert "type" in bead

    def test_list_beads_with_status_filter(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=open filters by status."""
        # This will filter at the bd command level
        mock_result = Mock(
            returncode=0,
            stdout="[P1] [open] [task] proj-001: Open task",
            stderr="",
        )

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch(
                "app.services.beads.subprocess.run", return_value=mock_result
            ) as mock_run:
                response = client.get(
                    "/api/projects/project-with-beads/beads?status=open"
                )

        assert response.status_code == 200
        # Verify the status filter was passed to bd command
        call_args = mock_run.call_args[0][0]
        assert "--status" in call_args
        assert "open" in call_args

    def test_list_beads_project_not_found(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads returns 404 for nonexistent project."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/nonexistent/beads")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_list_beads_no_beads_initialized(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads returns 400 for project without beads."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get("/api/projects/project-no-beads/beads")

        assert response.status_code == 400
        assert "beads" in response.json()["detail"].lower()

    def test_list_beads_empty_list(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads returns empty list when no beads exist."""
        mock_result = Mock(returncode=0, stdout="", stderr="")

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get("/api/projects/project-with-beads/beads")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_beads_bd_command_failure(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads returns empty list on bd failure."""
        mock_result = Mock(returncode=1, stdout="", stderr="bd command failed")

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get("/api/projects/project-with-beads/beads")

        assert response.status_code == 200
        assert response.json() == []

    # =========================================================================
    # Status Filter Validation Tests
    # =========================================================================

    def test_list_beads_invalid_status_returns_422(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=invalid returns 422."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get(
                "/api/projects/project-with-beads/beads?status=invalid"
            )

        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("status" in str(err).lower() for err in error_detail)

    def test_list_beads_invalid_status_random_string(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=foobar returns 422."""
        with patch("app.main.project_service.workspace_path", mock_workspace):
            response = client.get(
                "/api/projects/project-with-beads/beads?status=foobar"
            )

        assert response.status_code == 422

    def test_list_beads_valid_status_in_progress(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=in_progress returns 200."""
        mock_result = Mock(
            returncode=0,
            stdout="[P1] [in_progress] [task] proj-001: In progress task",
            stderr="",
        )

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get(
                    "/api/projects/project-with-beads/beads?status=in_progress"
                )

        assert response.status_code == 200

    def test_list_beads_valid_status_closed(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=closed returns 200."""
        mock_result = Mock(
            returncode=0,
            stdout="[P1] [closed] [task] proj-001: Closed task",
            stderr="",
        )

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get(
                    "/api/projects/project-with-beads/beads?status=closed"
                )

        assert response.status_code == 200

    def test_list_beads_valid_status_blocked(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=blocked returns 200."""
        mock_result = Mock(
            returncode=0,
            stdout="[P1] [blocked] [task] proj-001: Blocked task",
            stderr="",
        )

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get(
                    "/api/projects/project-with-beads/beads?status=blocked"
                )

        assert response.status_code == 200

    def test_list_beads_valid_status_deferred(
        self, client: TestClient, mock_workspace: Path
    ) -> None:
        """GET /api/projects/{id}/beads?status=deferred returns 200."""
        mock_result = Mock(
            returncode=0,
            stdout="[P1] [deferred] [task] proj-001: Deferred task",
            stderr="",
        )

        with patch("app.main.project_service.workspace_path", mock_workspace):
            with patch("app.services.beads.subprocess.run", return_value=mock_result):
                response = client.get(
                    "/api/projects/project-with-beads/beads?status=deferred"
                )

        assert response.status_code == 200
