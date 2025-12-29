"""Shared test fixtures for Claude Dev Container backend."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_project(tmp_path):
    """Create a temporary project directory with git and beads initialized."""
    project = tmp_path / "test-project"
    project.mkdir()
    (project / ".git").mkdir()
    (project / ".beads").mkdir()
    return str(project)


@pytest.fixture
def mock_project_no_beads(tmp_path):
    """Create a temporary project directory with only git initialized."""
    project = tmp_path / "test-project-no-beads"
    project.mkdir()
    (project / ".git").mkdir()
    return str(project)


@pytest.fixture
def mock_beads():
    """Sample bead data for testing."""
    return [
        {
            "id": "beads-001",
            "title": "Test bead",
            "status": "open",
            "description": "A test bead",
            "priority": 2,
            "type": "task",
        },
        {
            "id": "beads-002",
            "title": "Another bead",
            "status": "in_progress",
            "description": "Another test bead",
            "priority": 1,
            "type": "feature",
        },
    ]
