"""Unit tests for project discovery service."""

import pytest
from pathlib import Path

from app.services.projects import ProjectService
from app.models import Project


class TestProjectService:
    """Tests for ProjectService."""

    @pytest.fixture
    def workspace(self, tmp_path: Path) -> Path:
        """Create a temporary workspace directory."""
        workspace = tmp_path / "projects"
        workspace.mkdir()
        return workspace

    @pytest.fixture
    def service(self, workspace: Path) -> ProjectService:
        """Create ProjectService instance with test workspace."""
        return ProjectService(workspace_path=workspace)

    def test_list_projects_empty_workspace(self, service: ProjectService) -> None:
        """Listing projects in empty workspace returns empty list."""
        result = service.list_projects()
        assert result == []

    def test_list_projects_nonexistent_workspace(self, tmp_path: Path) -> None:
        """Listing projects with nonexistent workspace returns empty list."""
        service = ProjectService(workspace_path=tmp_path / "nonexistent")
        result = service.list_projects()
        assert result == []

    def test_list_projects_finds_git_repos(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Listing projects finds directories with .git subdirectory."""
        # Create two git repos
        (workspace / "project-a" / ".git").mkdir(parents=True)
        (workspace / "project-b" / ".git").mkdir(parents=True)

        result = service.list_projects()

        assert len(result) == 2
        assert result[0].id == "project-a"
        assert result[1].id == "project-b"

    def test_list_projects_ignores_non_git_dirs(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Listing projects ignores directories without .git."""
        # Git repo
        (workspace / "valid-project" / ".git").mkdir(parents=True)
        # Non-git directory
        (workspace / "not-a-repo").mkdir()

        result = service.list_projects()

        assert len(result) == 1
        assert result[0].id == "valid-project"

    def test_list_projects_ignores_files(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Listing projects ignores files in workspace."""
        (workspace / "project" / ".git").mkdir(parents=True)
        (workspace / "readme.txt").write_text("test")

        result = service.list_projects()

        assert len(result) == 1
        assert result[0].id == "project"

    def test_list_projects_detects_beads(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Listing projects correctly detects beads initialization."""
        # Project with beads
        (workspace / "with-beads" / ".git").mkdir(parents=True)
        (workspace / "with-beads" / ".beads").mkdir()
        # Project without beads
        (workspace / "no-beads" / ".git").mkdir(parents=True)

        result = service.list_projects()

        projects_by_id = {p.id: p for p in result}
        assert projects_by_id["with-beads"].has_beads is True
        assert projects_by_id["no-beads"].has_beads is False

    def test_list_projects_sorted_by_name(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Listing projects returns sorted by name."""
        (workspace / "zebra" / ".git").mkdir(parents=True)
        (workspace / "alpha" / ".git").mkdir(parents=True)
        (workspace / "middle" / ".git").mkdir(parents=True)

        result = service.list_projects()

        names = [p.name for p in result]
        assert names == ["alpha", "middle", "zebra"]

    def test_get_project_returns_project(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Getting existing project returns Project object."""
        (workspace / "my-project" / ".git").mkdir(parents=True)

        result = service.get_project("my-project")

        assert result is not None
        assert result.id == "my-project"
        assert result.name == "my-project"
        assert str(workspace / "my-project") in result.path

    def test_get_project_nonexistent_returns_none(
        self, service: ProjectService
    ) -> None:
        """Getting nonexistent project returns None."""
        result = service.get_project("does-not-exist")
        assert result is None

    def test_get_project_non_git_returns_none(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Getting directory without .git returns None."""
        (workspace / "not-a-repo").mkdir()

        result = service.get_project("not-a-repo")
        assert result is None

    def test_get_project_detects_beads(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Getting project correctly detects beads."""
        (workspace / "project" / ".git").mkdir(parents=True)
        (workspace / "project" / ".beads").mkdir()

        result = service.get_project("project")

        assert result is not None
        assert result.has_beads is True

    def test_get_project_no_beads(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Getting project without beads sets has_beads to False."""
        (workspace / "project" / ".git").mkdir(parents=True)

        result = service.get_project("project")

        assert result is not None
        assert result.has_beads is False

    def test_check_beads_initialized_true(self, tmp_path: Path) -> None:
        """check_beads_initialized returns True when .beads exists."""
        project = tmp_path / "project"
        project.mkdir()
        (project / ".beads").mkdir()

        service = ProjectService()
        result = service.check_beads_initialized(project)

        assert result is True

    def test_check_beads_initialized_false(self, tmp_path: Path) -> None:
        """check_beads_initialized returns False when .beads missing."""
        project = tmp_path / "project"
        project.mkdir()

        service = ProjectService()
        result = service.check_beads_initialized(project)

        assert result is False

    def test_project_model_structure(
        self, workspace: Path, service: ProjectService
    ) -> None:
        """Project objects have correct structure."""
        (workspace / "test-proj" / ".git").mkdir(parents=True)

        result = service.get_project("test-proj")

        assert result is not None
        assert isinstance(result, Project)
        assert isinstance(result.id, str)
        assert isinstance(result.name, str)
        assert isinstance(result.path, str)
        assert isinstance(result.has_beads, bool)
