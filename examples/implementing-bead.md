# Implementing a Bead: Complete Workflow

This example walks through implementing a typical bead from start to finish.

## Example: Implementing "Add project listing endpoint"

### 1. Claim the Work

```bash
# Find available work
bd ready

# Review the bead
bd show beads-007

# Claim it
bd update beads-007 --status in_progress
```

### 2. Create Feature Branch

```bash
git checkout main
git pull
git checkout -b beads-007-project-listing
```

### 3. Read Relevant Documentation

Before writing code:
- `docs/SIMPLIFIED_PLAN.md` - Check the planned implementation
- `docs/DESIGN_DECISIONS.md` - Understand architectural choices
- Existing code in the area you're modifying

### 4. Implement the Feature

**Add Schema** (`backend/app/schemas/project.py`):
```python
from pydantic import BaseModel

class ProjectOut(BaseModel):
    id: str
    name: str
    path: str
    has_beads: bool
```

**Add Service** (`backend/app/services/project.py`):
```python
from pathlib import Path
from app.schemas.project import ProjectOut

PROJECTS_DIR = Path.home() / "projects"

def list_projects() -> list[ProjectOut]:
    """List all projects in ~/projects with .beads directories."""
    projects = []
    for path in PROJECTS_DIR.iterdir():
        if path.is_dir() and (path / ".git").exists():
            projects.append(ProjectOut(
                id=path.name,
                name=path.name,
                path=str(path),
                has_beads=(path / ".beads").exists()
            ))
    return projects
```

**Add Router** (`backend/app/routers/projects.py`):
```python
from fastapi import APIRouter
from app.services.project import list_projects
from app.schemas.project import ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=list[ProjectOut])
def get_projects():
    """List all available projects."""
    return list_projects()
```

**Register Router** (`backend/app/main.py`):
```python
from app.routers import projects

app.include_router(projects.router)
```

### 5. Write Tests

**Unit Test** (`backend/tests/unit/test_project_service.py`):
```python
import pytest
from unittest.mock import patch, MagicMock
from app.services.project import list_projects

def test_list_projects_finds_git_repos(tmp_path):
    """Should find directories with .git folders."""
    # Create mock project
    project = tmp_path / "my-project"
    project.mkdir()
    (project / ".git").mkdir()
    (project / ".beads").mkdir()

    with patch("app.services.project.PROJECTS_DIR", tmp_path):
        projects = list_projects()

    assert len(projects) == 1
    assert projects[0].name == "my-project"
    assert projects[0].has_beads is True

def test_list_projects_ignores_non_git_dirs(tmp_path):
    """Should skip directories without .git."""
    (tmp_path / "not-a-project").mkdir()

    with patch("app.services.project.PROJECTS_DIR", tmp_path):
        projects = list_projects()

    assert len(projects) == 0
```

**Integration Test** (`backend/tests/integration/test_projects_api.py`):
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_projects_returns_list():
    """GET /projects should return a list."""
    response = client.get("/projects/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

### 6. Run Tests

```bash
cd backend

# Run unit tests for your changes
pytest tests/unit/test_project_service.py -v

# Run integration tests
pytest tests/integration/test_projects_api.py -v

# Run all tests to ensure nothing broke
pytest
```

### 7. Run Linter

```bash
ruff check .
ruff format --check .

# Fix any issues
ruff format .
```

### 8. Update Notes (if pausing)

If you need to pause before finishing:

```bash
bd update beads-007 --notes "
COMPLETED: Schema and service implemented
IN PROGRESS: Router added, writing tests
BLOCKERS: None
KEY DECISIONS: Used Path.home()/projects as default dir
NEXT: Finish integration tests, then close
"
```

### 9. Commit and Push

```bash
git add .
git commit -m "Add project listing endpoint (beads-007)"
git push -u origin beads-007-project-listing
```

### 10. Close the Bead

```bash
bd close beads-007 --reason "Completed: Added GET /projects endpoint with tests"
bd sync
```

### 11. Create PR

```bash
gh pr create --title "Add project listing endpoint" --body "$(cat <<'EOF'
## Summary
- Added GET /projects endpoint to list available projects
- Scans ~/projects for git repos with optional .beads directories
- Includes unit and integration tests

## Test plan
- [x] Unit tests pass
- [x] Integration tests pass
- [ ] Manual test on real projects directory

Closes beads-007

🤖 Generated with Claude Code
EOF
)"
```

## Checklist

- [ ] Bead claimed (`bd update --status in_progress`)
- [ ] Feature branch created
- [ ] Code implemented following existing patterns
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Linter passes
- [ ] Committed with bead ID in message
- [ ] Pushed to remote
- [ ] Bead closed with reason
- [ ] `bd sync` run
- [ ] PR created (if ready for review)
