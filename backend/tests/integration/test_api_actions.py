"""Integration tests for action endpoints (work, review, push-pr, progress)."""

from unittest.mock import patch, Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import ExecutionResult, ExecutionState, ProgressInfo


class TestWorkOnBeadAPI:
    """Integration tests for POST /api/projects/{project_id}/work/{bead_id} endpoint."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_project(self):
        """Mock project with beads for testing."""
        return Mock(
            id="test-project",
            name="test-project",
            path="/path/to/project",
            has_beads=True,
        )

    @pytest.fixture
    def mock_project_no_beads(self):
        """Mock project without beads for testing."""
        return Mock(
            id="test-project",
            name="test-project",
            path="/path/to/project",
            has_beads=False,
        )

    @pytest.fixture
    def mock_execution_result(self):
        """Mock execution result."""
        return ExecutionResult(
            output="Bead implementation completed successfully",
            state=ExecutionState.completed,
            exit_code=0,
        )

    def test_work_on_bead_success(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_execution_result: ExecutionResult,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} executes Claude on bead."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_claude",
                    return_value=mock_execution_result,
                ):
                    response = client.post("/api/projects/test-project/work/bead-001")

        assert response.status_code == 200
        data = response.json()
        assert data["output"] == "Bead implementation completed successfully"
        assert data["state"] == "completed"
        assert data["exit_code"] == 0

    def test_work_on_bead_with_context(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_execution_result: ExecutionResult,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} passes context to Claude."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_claude",
                    return_value=mock_execution_result,
                ) as mock_exec:
                    response = client.post(
                        "/api/projects/test-project/work/bead-001",
                        json={"context": "Focus on error handling"},
                    )

        assert response.status_code == 200
        # Verify the prompt includes the context
        call_args = mock_exec.call_args
        assert "Focus on error handling" in call_args[0][1]

    def test_work_on_bead_project_not_found(
        self,
        client: TestClient,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} returns 404 for missing project."""
        with patch("app.main.project_service.get_project", return_value=None):
            response = client.post("/api/projects/nonexistent/work/bead-001")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_work_on_bead_no_beads_initialized(
        self,
        client: TestClient,
        mock_project_no_beads: Mock,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} returns 400 if no beads."""
        with patch("app.main.project_service.get_project", return_value=mock_project_no_beads):
            response = client.post("/api/projects/test-project/work/bead-001")

        assert response.status_code == 400
        assert "beads initialized" in response.json()["detail"]

    def test_work_on_bead_container_start_failure(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} returns 500 on container failure."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.ensure_container",
                side_effect=Exception("Docker not available"),
            ):
                response = client.post("/api/projects/test-project/work/bead-001")

        assert response.status_code == 500
        assert "Failed to start container" in response.json()["detail"]

    def test_work_on_bead_execution_failure(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/work/{bead_id} returns 500 on execution failure."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_claude",
                    side_effect=KeyError("No container"),
                ):
                    response = client.post("/api/projects/test-project/work/bead-001")

        assert response.status_code == 500
        assert "Container not available" in response.json()["detail"]


class TestReviewWorkAPI:
    """Integration tests for POST /api/projects/{project_id}/review endpoint."""

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
    def mock_execution_result(self):
        """Mock execution result."""
        return ExecutionResult(
            output="Review completed: 3 issues found",
            state=ExecutionState.completed,
            exit_code=0,
        )

    def test_review_work_success(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_execution_result: ExecutionResult,
    ) -> None:
        """POST /api/projects/{id}/review executes Claude review."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_claude",
                    return_value=mock_execution_result,
                ) as mock_exec:
                    response = client.post("/api/projects/test-project/review")

        assert response.status_code == 200
        data = response.json()
        assert "Review completed" in data["output"]
        assert data["state"] == "completed"
        # Verify review command was called
        mock_exec.assert_called_once_with("test-project", "/review-implementation")

    def test_review_work_project_not_found(
        self,
        client: TestClient,
    ) -> None:
        """POST /api/projects/{id}/review returns 404 for missing project."""
        with patch("app.main.project_service.get_project", return_value=None):
            response = client.post("/api/projects/nonexistent/review")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_review_work_container_start_failure(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/review returns 500 on container failure."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.ensure_container",
                side_effect=Exception("Docker not available"),
            ):
                response = client.post("/api/projects/test-project/review")

        assert response.status_code == 500
        assert "Failed to start container" in response.json()["detail"]


class TestPushPRAPI:
    """Integration tests for POST /api/projects/{project_id}/push-pr endpoint."""

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

    def test_push_pr_success(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/push-pr pushes and creates PR."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_command",
                    side_effect=[
                        "feature/my-branch\n",  # git rev-parse
                        "Branch pushed successfully\n",  # git push
                        "https://github.com/org/repo/pull/123\n",  # gh pr create
                    ],
                ):
                    response = client.post("/api/projects/test-project/push-pr")

        assert response.status_code == 200
        data = response.json()
        assert data["branch"] == "feature/my-branch"
        assert "https://github.com/org/repo/pull/123" in data["pr_url"]

    def test_push_pr_with_custom_title(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/push-pr uses custom PR title."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_command",
                    side_effect=[
                        "feature/my-branch\n",
                        "Branch pushed successfully\n",
                        "https://github.com/org/repo/pull/124\n",
                    ],
                ) as mock_exec:
                    response = client.post(
                        "/api/projects/test-project/push-pr",
                        json={"title": "My Custom PR Title"},
                    )

        assert response.status_code == 200
        # Verify custom title was used in gh command
        calls = mock_exec.call_args_list
        pr_cmd = calls[2][0][1]
        assert "My Custom PR Title" in pr_cmd

    def test_push_pr_project_not_found(
        self,
        client: TestClient,
    ) -> None:
        """POST /api/projects/{id}/push-pr returns 404 for missing project."""
        with patch("app.main.project_service.get_project", return_value=None):
            response = client.post("/api/projects/nonexistent/push-pr")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_push_pr_container_not_available(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/push-pr returns 500 when container not available."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_command",
                    side_effect=KeyError("No container"),
                ):
                    response = client.post("/api/projects/test-project/push-pr")

        assert response.status_code == 500
        assert "Container not available" in response.json()["detail"]

    def test_push_pr_escapes_shell_metacharacters(
        self,
        client: TestClient,
        mock_project: Mock,
    ) -> None:
        """POST /api/projects/{id}/push-pr properly escapes shell metacharacters in title."""
        # Title with shell metacharacters that could be exploited for injection
        malicious_title = 'Fix bug"; rm -rf / #'

        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch("app.main.container_service.ensure_container", return_value="container-123"):
                with patch(
                    "app.main.container_service.exec_command",
                    side_effect=[
                        "feature/my-branch\n",
                        "Branch pushed successfully\n",
                        "https://github.com/org/repo/pull/125\n",
                    ],
                ) as mock_exec:
                    response = client.post(
                        "/api/projects/test-project/push-pr",
                        json={"title": malicious_title},
                    )

        assert response.status_code == 200
        # Verify the command was properly escaped - shlex.quote wraps in single quotes
        calls = mock_exec.call_args_list
        pr_cmd = calls[2][0][1]
        # shlex.quote wraps strings with shell metacharacters in single quotes
        # Expected: gh pr create --title 'Fix bug"; rm -rf / #' --fill
        assert pr_cmd == "gh pr create --title 'Fix bug\"; rm -rf / #' --fill"


class TestProgressAPI:
    """Integration tests for GET /api/projects/{project_id}/progress endpoint."""

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
    def mock_progress_running(self):
        """Mock progress info for running execution."""
        return ProgressInfo(
            running=True,
            output="Step 1: Analyzing code...\nStep 2: Processing...",
            recent="Step 2: Processing...",
            bytes=100,
        )

    @pytest.fixture
    def mock_progress_idle(self):
        """Mock progress info when no execution is running."""
        return ProgressInfo(
            running=False,
            output="",
            recent="",
            bytes=0,
        )

    def test_progress_returns_running_status(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_progress_running: ProgressInfo,
    ) -> None:
        """GET /api/projects/{id}/progress returns current execution status."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_progress",
                return_value=mock_progress_running,
            ):
                response = client.get("/api/projects/test-project/progress")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert "Analyzing code" in data["output"]
        assert data["bytes"] == 100

    def test_progress_returns_idle_status(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_progress_idle: ProgressInfo,
    ) -> None:
        """GET /api/projects/{id}/progress returns idle when no execution."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_progress",
                return_value=mock_progress_idle,
            ):
                response = client.get("/api/projects/test-project/progress")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is False
        assert data["output"] == ""
        assert data["bytes"] == 0

    def test_progress_project_not_found(
        self,
        client: TestClient,
    ) -> None:
        """GET /api/projects/{id}/progress returns 404 for missing project."""
        with patch("app.main.project_service.get_project", return_value=None):
            response = client.get("/api/projects/nonexistent/progress")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_progress_includes_recent_output(
        self,
        client: TestClient,
        mock_project: Mock,
        mock_progress_running: ProgressInfo,
    ) -> None:
        """GET /api/projects/{id}/progress includes recent output preview."""
        with patch("app.main.project_service.get_project", return_value=mock_project):
            with patch(
                "app.main.container_service.get_progress",
                return_value=mock_progress_running,
            ):
                response = client.get("/api/projects/test-project/progress")

        assert response.status_code == 200
        data = response.json()
        assert "recent" in data
        assert data["recent"] == "Step 2: Processing..."
