# Testing Guide

> **Audience**: Agents and developers implementing features

This guide explains how to write tests, which tests to run, and where test files belong.

## Quick Reference

### Run Commands

```bash
# Backend (pytest)
pytest backend/tests/unit                    # All unit tests
pytest backend/tests/unit/test_containers.py # Specific file
pytest backend/tests/unit -k "create"        # Tests matching pattern
pytest backend/tests/integration             # Integration tests
pytest -m smoke                              # Smoke tests only

# Frontend (vitest)
npm test                                     # All tests (watch mode)
npm test -- --run                            # All tests (single run)
npm test -- BeadList                         # Tests matching pattern
npm test -- --coverage                       # With coverage report

# E2E (playwright)
npx playwright test                          # All E2E tests
npx playwright test flows/work-flow.spec.ts  # Specific flow
npx playwright test --ui                     # Interactive UI mode
```

### File Locations

```
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures
│   ├── unit/
│   │   ├── test_containers.py   # Unit tests for services/containers.py
│   │   ├── test_beads.py        # Unit tests for services/beads.py
│   │   └── test_projects.py     # Unit tests for services/projects.py
│   ├── integration/
│   │   ├── test_container_api.py
│   │   └── test_bead_api.py
│   └── fixtures/
│       └── mock_docker.py       # Reusable test utilities

frontend/
├── tests/
│   ├── setup.ts                 # Test configuration
│   ├── components/
│   │   ├── BeadList.test.tsx
│   │   ├── ProjectList.test.tsx
│   │   └── ActionBar.test.tsx
│   ├── mocks/
│   │   └── handlers.ts          # MSW mock handlers
│   └── api.test.ts
├── e2e/
│   ├── playwright.config.ts
│   └── flows/
│       ├── work-flow.spec.ts    # Work action E2E
│       └── review-flow.spec.ts  # Review action E2E
```

## Which Tests to Run

Before committing, run tests based on what you changed:

### Backend Changes

| Changed File | Run These Tests |
|--------------|-----------------|
| `backend/app/services/containers.py` | `pytest backend/tests/unit/test_containers.py backend/tests/integration/test_container_api.py` |
| `backend/app/services/beads.py` | `pytest backend/tests/unit/test_beads.py backend/tests/integration/test_bead_api.py` |
| `backend/app/services/projects.py` | `pytest backend/tests/unit/test_projects.py` |
| `backend/app/main.py` | `pytest backend/tests/integration/` |
| `backend/app/models.py` | `pytest backend/tests/unit/` |
| `backend/app/prompts.py` | `pytest backend/tests/unit/test_prompts.py` |
| Multiple backend files | `pytest backend/tests/unit && pytest -m smoke` |

### Frontend Changes

| Changed File | Run These Tests |
|--------------|-----------------|
| `frontend/src/components/BeadList.tsx` | `npm test -- BeadList` |
| `frontend/src/components/ProjectList.tsx` | `npm test -- ProjectList` |
| `frontend/src/components/ActionBar.tsx` | `npm test -- ActionBar` |
| `frontend/src/api.ts` | `npm test -- api` |
| Multiple frontend files | `npm test -- --run` |

### Docker Changes

| Changed File | Run These Tests |
|--------------|-----------------|
| `docker/Dockerfile` | `pytest -m docker` |
| `docker/scripts/*` | `pytest -m docker` |

### Cross-Layer Changes

If you changed files across multiple layers (backend + frontend, etc.):

```bash
# Run all unit tests
pytest backend/tests/unit && npm test -- --run

# Run smoke integration
pytest -m smoke
```

## Writing Tests

### Backend Unit Test Pattern

```python
# backend/tests/unit/test_containers.py
import pytest
from unittest.mock import Mock, patch
from app.services.containers import ContainerService

class TestContainerService:
    """Tests for ContainerService."""

    @pytest.fixture
    def service(self):
        """Create service instance with mocked Docker client."""
        with patch('app.services.containers.docker') as mock_docker:
            yield ContainerService(), mock_docker

    def test_create_container_with_valid_project_returns_container_id(self, service):
        """Creating a container for a valid project should return the container ID."""
        svc, mock_docker = service
        mock_docker.containers.run.return_value = Mock(id="abc123")

        result = svc.create_container("/path/to/project")

        assert result == "abc123"
        mock_docker.containers.run.assert_called_once()

    def test_create_container_without_project_path_raises_error(self, service):
        """Creating a container without a project path should raise ValueError."""
        svc, _ = service

        with pytest.raises(ValueError, match="Project path required"):
            svc.create_container("")
```

### Backend Integration Test Pattern

```python
# backend/tests/integration/test_container_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

class TestContainerAPI:
    """Integration tests for container endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.mark.smoke
    def test_health_check_returns_ok(self, client):
        """GET /health should return 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_create_container_endpoint_returns_container_id(self, client, mock_project):
        """POST /containers should create container and return ID."""
        response = client.post("/containers", json={"project_path": mock_project})

        assert response.status_code == 201
        assert "container_id" in response.json()
```

### Frontend Component Test Pattern

```typescript
// frontend/tests/components/BeadList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { BeadList } from '../../src/components/BeadList';

describe('BeadList', () => {
  const mockBeads = [
    { id: 'beads-001', title: 'Fix bug', status: 'open' },
    { id: 'beads-002', title: 'Add feature', status: 'in_progress' },
  ];

  it('should display loading spinner when fetching', () => {
    render(<BeadList beads={[]} loading={true} onSelect={vi.fn()} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show empty state when no beads exist', () => {
    render(<BeadList beads={[]} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText(/no beads found/i)).toBeInTheDocument();
  });

  it('should render all beads', () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Fix bug')).toBeInTheDocument();
    expect(screen.getByText('Add feature')).toBeInTheDocument();
  });

  it('should call onSelect when bead is clicked', () => {
    const onSelect = vi.fn();
    render(<BeadList beads={mockBeads} loading={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Fix bug'));

    expect(onSelect).toHaveBeenCalledWith('beads-001');
  });
});
```

### E2E Test Pattern

```typescript
// frontend/e2e/flows/work-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Work Flow', () => {
  test('should execute work action on selected bead', async ({ page }) => {
    // Arrange: Navigate and select project
    await page.goto('/');
    await page.click('[data-testid="project-list"] >> text=my-project');

    // Arrange: Select a bead
    await page.click('[data-testid="bead-list"] >> text=Fix authentication bug');

    // Act: Click work button
    await page.click('[data-testid="action-work"]');

    // Assert: Output view shows execution
    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'Executing work action'
    );

    // Assert: Eventually shows completion
    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'completed',
      { timeout: 60000 }
    );
  });
});
```

## Test Markers

Use pytest markers to categorize tests:

```python
# Mark slow integration tests
@pytest.mark.integration
def test_full_container_lifecycle():
    pass

# Mark smoke tests (quick integration checks)
@pytest.mark.smoke
def test_api_health_check():
    pass

# Mark tests that need Docker
@pytest.mark.docker
def test_container_creation():
    pass

# Mark slow tests that shouldn't run in watch mode
@pytest.mark.slow
def test_large_file_processing():
    pass
```

Configure in `pytest.ini`:

```ini
[pytest]
markers =
    smoke: Quick integration checks (run on pre-push)
    integration: Full integration tests
    docker: Tests requiring Docker daemon
    slow: Tests too slow for watch mode
```

Run specific markers:

```bash
pytest -m smoke                    # Only smoke tests
pytest -m "not slow"               # Skip slow tests
pytest -m "integration and docker" # Docker integration tests
```

## Fixtures

### Shared Backend Fixtures

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def mock_project(tmp_path):
    """Create a temporary project directory."""
    project = tmp_path / "test-project"
    project.mkdir()
    (project / ".git").mkdir()
    return str(project)

@pytest.fixture
def mock_beads():
    """Sample bead data for testing."""
    return [
        {"id": "beads-001", "title": "Test bead", "status": "open"},
    ]
```

### Shared Frontend Fixtures

```typescript
// frontend/tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/projects', () => {
    return HttpResponse.json([
      { path: '/home/user/project1', name: 'project1' },
    ]);
  }),

  http.get('/api/beads', () => {
    return HttpResponse.json([
      { id: 'beads-001', title: 'Fix bug', status: 'open' },
    ]);
  }),
];
```

## Pre-Commit / Pre-Push Hooks

Tests are enforced via git hooks:

```bash
# .husky/pre-commit (frontend)
npm test -- --run

# Runs automatically before each commit
```

```bash
# .husky/pre-push
pytest backend/tests/unit
pytest -m smoke
npm test -- --run

# Runs before pushing to remote
```

## Debugging Failed Tests

### Backend

```bash
# Run with verbose output
pytest -v backend/tests/unit/test_containers.py

# Run with print statements visible
pytest -s backend/tests/unit/test_containers.py

# Run specific test
pytest backend/tests/unit/test_containers.py::TestContainerService::test_create_container

# Drop into debugger on failure
pytest --pdb backend/tests/unit/test_containers.py
```

### Frontend

```bash
# Run in UI mode
npm test -- --ui

# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- BeadList.test.tsx
```

### E2E

```bash
# Run with headed browser (see what's happening)
npx playwright test --headed

# Run with UI mode (step through tests)
npx playwright test --ui

# Debug specific test
npx playwright test flows/work-flow.spec.ts --debug
```

## Checklist Before Committing

- [ ] Wrote tests for new functionality
- [ ] Ran unit tests for changed files
- [ ] Ran smoke integration if touching boundaries
- [ ] All tests pass
- [ ] No skipped tests without explanation

## See Also

- [TESTING_PHILOSOPHY.md](./TESTING_PHILOSOPHY.md) - Why we test this way
- [SIMPLIFIED_PLAN.md](./SIMPLIFIED_PLAN.md) - Test stack in MVP spec
