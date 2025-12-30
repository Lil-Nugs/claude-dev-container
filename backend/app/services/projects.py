"""Project service for scanning and managing workspace projects."""

import logging
from pathlib import Path

from app.config import settings
from app.models import Project

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for managing workspace projects."""

    def __init__(self, workspace_path: Path | None = None) -> None:
        """Initialize the project service.

        Args:
            workspace_path: Optional path to workspace. Defaults to settings.workspace_path.
        """
        self.workspace_path = workspace_path or settings.workspace_path

    def list_projects(self) -> list[Project]:
        """List all projects in the workspace.

        Scans the workspace directory for git repositories. A directory is
        considered a project if it contains a .git subdirectory.

        Returns:
            List of Project objects found in the workspace, sorted by name.
        """
        workspace = Path(self.workspace_path).expanduser()
        if not workspace.exists():
            return []

        projects = []
        for item in workspace.iterdir():
            if not item.is_dir():
                continue
            if not (item / ".git").exists():
                continue

            projects.append(
                Project(
                    id=item.name,
                    name=item.name,
                    path=str(item),
                    has_beads=(item / ".beads").exists(),
                )
            )

        return sorted(projects, key=lambda p: p.name)

    def get_project(self, project_id: str) -> Project | None:
        """Get a specific project by ID.

        Args:
            project_id: The project identifier (directory name).

        Returns:
            Project if found, None otherwise.

        Security:
            Validates that the resolved path stays within workspace_path
            to prevent path traversal attacks.
        """
        workspace = Path(self.workspace_path).expanduser().resolve()
        project_path = (workspace / project_id).resolve()

        # Security: Validate path traversal - ensure resolved path is within workspace
        if not self._is_path_within_workspace(project_path, workspace):
            logger.warning(f"Path traversal attempt detected: {project_id}")
            return None

        if not project_path.exists() or not project_path.is_dir():
            return None
        if not (project_path / ".git").exists():
            return None

        return Project(
            id=project_id,
            name=project_id,
            path=str(project_path),
            has_beads=(project_path / ".beads").exists(),
        )

    def _is_path_within_workspace(self, path: Path, workspace: Path) -> bool:
        """Check if a path is within the workspace directory.

        Args:
            path: The path to check (should be resolved/absolute).
            workspace: The workspace directory (should be resolved/absolute).

        Returns:
            True if path is within workspace, False otherwise.
        """
        try:
            path.relative_to(workspace)
            return True
        except ValueError:
            return False

    def check_beads_initialized(self, project_path: Path) -> bool:
        """Check if a project has beads initialized.

        Args:
            project_path: Path to the project directory.

        Returns:
            True if beads is initialized (.beads directory exists), False otherwise.
        """
        path = Path(project_path)
        return (path / ".beads").exists()
