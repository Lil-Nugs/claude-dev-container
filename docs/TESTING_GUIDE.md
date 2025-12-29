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

### Complete E2E Test Scenarios

The following tests provide comprehensive coverage for the MVP frontend flows.

#### 1. Project Selection Flow (`project-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Project Selection', () => {
  test('should display project list on load', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount.greaterThan(0);
  });

  test('should show beads when project is selected', async ({ page }) => {
    await page.goto('/');

    // Select first project
    await page.click('[data-testid="project-card"]:first-child');

    // Beads should appear
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="bead-item"]')).toHaveCount.greaterThan(0);
  });

  test('should show empty state when no projects', async ({ page }) => {
    // Mock empty response (requires MSW or route interception)
    await page.route('/api/projects', route => {
      route.fulfill({ json: [] });
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="empty-projects"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-projects"]')).toContainText('No projects');
  });
});
```

#### 2. Review Flow (`review-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
  });

  test('should execute review action', async ({ page }) => {
    // Click review button (no bead selection needed)
    await page.click('[data-testid="action-review"]');

    // Should show reviewing state
    await expect(page.locator('[data-testid="action-review"]')).toContainText('Reviewing');

    // Wait for completion
    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'Review complete',
      { timeout: 60000 }
    );
  });

  test('should show review output with diff summary', async ({ page }) => {
    await page.click('[data-testid="action-review"]');

    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'changes',
      { timeout: 60000 }
    );
  });
});
```

#### 3. Push & PR Flow (`push-pr-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Push & PR Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
  });

  test('should create PR and show URL', async ({ page }) => {
    await page.click('[data-testid="action-push-pr"]');

    // Should show pushing state
    await expect(page.locator('[data-testid="action-push-pr"]')).toContainText('Pushing');

    // Wait for PR URL in output
    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'github.com',
      { timeout: 60000 }
    );
  });

  test('should show PR link as clickable', async ({ page }) => {
    await page.click('[data-testid="action-push-pr"]');

    // Wait for PR link
    const prLink = page.locator('[data-testid="output-view"] a[href*="github.com"]');
    await expect(prLink).toBeVisible({ timeout: 60000 });
  });
});
```

#### 4. Error Handling (`error-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should show error when container not running', async ({ page }) => {
    // Mock error response
    await page.route('/api/projects/*/work/*', route => {
      route.fulfill({
        status: 500,
        json: { error: 'Container not running' }
      });
    });

    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Container not running'
    );
  });

  test('should show network error banner when offline', async ({ page }) => {
    await page.goto('/');

    // Simulate offline
    await page.context().setOffline(true);

    // Attempt to select project
    await page.click('[data-testid="project-card"]:first-child');

    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  });

  test('should recover when back online', async ({ page }) => {
    await page.goto('/');
    await page.context().setOffline(true);

    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    await page.context().setOffline(false);

    await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();
  });

  test('should show error when project not found', async ({ page }) => {
    await page.route('/api/projects/invalid-id', route => {
      route.fulfill({
        status: 404,
        json: { error: 'Project not found' }
      });
    });

    await page.goto('/project/invalid-id');

    await expect(page.locator('[data-testid="error-state"]')).toContainText(
      'Project not found'
    );
  });
});
```

#### 5. Loading States (`loading-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Loading States', () => {
  test('should show skeleton while loading projects', async ({ page }) => {
    // Delay response to see skeleton
    await page.route('/api/projects', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="project-skeleton"]')).toBeVisible();

    // Eventually shows real content
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-skeleton"]')).not.toBeVisible();
  });

  test('should show spinner during work action', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    // Button should show loading state with timer
    await expect(page.locator('[data-testid="action-work"]')).toContainText('Working');
    await expect(page.locator('[data-testid="action-work"]')).toContainText(':');
  });
});
```

#### 6. Bead Selection (`bead-selection.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Bead Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
  });

  test('should highlight selected bead', async ({ page }) => {
    const firstBead = page.locator('[data-testid="bead-item"]:first-child');
    await firstBead.click();

    await expect(firstBead).toHaveClass(/selected|bg-blue/);
  });

  test('should enable work button only when bead selected', async ({ page }) => {
    const workButton = page.locator('[data-testid="action-work"]');

    // Initially disabled
    await expect(workButton).toBeDisabled();

    // Select bead
    await page.click('[data-testid="bead-item"]:first-child');

    // Now enabled
    await expect(workButton).toBeEnabled();
  });

  test('should show bead details when selected', async ({ page }) => {
    await page.click('[data-testid="bead-item"]:first-child');

    await expect(page.locator('[data-testid="bead-detail"]')).toBeVisible();
  });

  test('should filter beads by status', async ({ page }) => {
    // Click status filter
    await page.click('[data-testid="filter-status"]');
    await page.click('text=In Progress');

    // All visible beads should have in_progress status
    const beads = page.locator('[data-testid="bead-item"]');
    const count = await beads.count();

    for (let i = 0; i < count; i++) {
      await expect(beads.nth(i)).toContainText(/in.progress/i);
    }
  });
});
```

#### 7. Mobile Responsive (`mobile.spec.ts`)

```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive', () => {
  test.use(devices['iPhone 13']);

  test('should show project dropdown instead of list', async ({ page }) => {
    await page.goto('/');

    // Desktop list should be hidden
    await expect(page.locator('[data-testid="project-list"]')).not.toBeVisible();

    // Mobile dropdown should be visible
    await expect(page.locator('[data-testid="project-dropdown"]')).toBeVisible();
  });

  test('should have fixed action bar at bottom', async ({ page }) => {
    await page.goto('/');

    const actionBar = page.locator('[data-testid="action-bar"]');
    const box = await actionBar.boundingBox();

    // Should be at bottom of viewport
    const viewport = page.viewportSize();
    expect(box?.y).toBeGreaterThan((viewport?.height ?? 0) - 100);
  });

  test('should expand output sheet on tap', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-dropdown"]');
    await page.selectOption('[data-testid="project-dropdown"]', { index: 0 });

    // Tap output handle
    await page.click('[data-testid="output-handle"]');

    const outputSheet = page.locator('[data-testid="output-sheet"]');
    await expect(outputSheet).toHaveClass(/expanded/);
  });

  test('should have 44px minimum touch targets', async ({ page }) => {
    await page.goto('/');

    const buttons = page.locator('[data-testid^="action-"]');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
```

#### 8. Terminal Access (`terminal-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Terminal Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
  });

  test('should show terminal modal with command', async ({ page }) => {
    await page.click('[data-testid="action-terminal"]');

    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="terminal-command"]')).toContainText(
      'docker exec'
    );
  });

  test('should copy command to clipboard', async ({ page }) => {
    await page.click('[data-testid="action-terminal"]');
    await page.click('[data-testid="copy-command"]');

    // Check for success indicator
    await expect(page.locator('[data-testid="copy-command"]')).toContainText('✓');
  });

  test('should close terminal modal', async ({ page }) => {
    await page.click('[data-testid="action-terminal"]');
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    await page.click('[data-testid="terminal-close"]');
    await expect(page.locator('[data-testid="terminal-modal"]')).not.toBeVisible();
  });
});
```

#### 9. PWA Behavior (`pwa.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('PWA Behavior', () => {
  test('should have valid manifest', async ({ page }) => {
    await page.goto('/');

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return null;
      const response = await fetch(link.getAttribute('href') || '');
      return response.json();
    });

    expect(manifest).not.toBeNull();
    expect(manifest.name).toBe('DevContainer');
    expect(manifest.display).toBe('standalone');
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    const hasServiceWorker = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });

    expect(hasServiceWorker).toBe(true);
  });

  test('should work offline with cached data', async ({ page }) => {
    // First visit to cache
    await page.goto('/');
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible();

    // Go offline
    await page.context().setOffline(true);

    // Reload
    await page.reload();

    // Should still show cached projects
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  });
});
```

#### 10. Execution Status Updates (`execution-status.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Execution Status Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="bead-item"]:first-child');
  });

  test('should poll progress and update output', async ({ page }) => {
    await page.click('[data-testid="action-work"]');

    // Should see output updating
    const output = page.locator('[data-testid="output-view"]');

    // Wait for first content
    await expect(output).not.toBeEmpty({ timeout: 5000 });

    // Get initial content
    const initialContent = await output.textContent();

    // Wait and check for updates
    await page.waitForTimeout(2000);
    const updatedContent = await output.textContent();

    // Content should have grown (execution produces output)
    expect(updatedContent?.length).toBeGreaterThan(initialContent?.length ?? 0);
  });

  test('should show elapsed time during execution', async ({ page }) => {
    await page.click('[data-testid="action-work"]');

    const button = page.locator('[data-testid="action-work"]');

    // Wait for timer to appear
    await expect(button).toContainText('0:0', { timeout: 5000 });

    // Wait and check timer increments
    await page.waitForTimeout(3000);
    await expect(button).toContainText(/0:0[2-9]|0:1/);
  });

  test('should enable actions after execution completes', async ({ page }) => {
    await page.click('[data-testid="action-work"]');

    // Buttons disabled during execution
    await expect(page.locator('[data-testid="action-review"]')).toBeDisabled();

    // Wait for completion
    await expect(page.locator('[data-testid="output-view"]')).toContainText(
      'completed',
      { timeout: 60000 }
    );

    // Buttons re-enabled
    await expect(page.locator('[data-testid="action-review"]')).toBeEnabled();
  });
});
```

### E2E Test Configuration

#### Playwright Config (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Summary

| Test File | Scenarios | Focus Area |
|-----------|-----------|------------|
| `project-flow.spec.ts` | 3 | Project listing and selection |
| `work-flow.spec.ts` | 1 | Work action execution |
| `review-flow.spec.ts` | 2 | Review action execution |
| `push-pr-flow.spec.ts` | 2 | Push and PR creation |
| `error-flow.spec.ts` | 4 | Error handling and recovery |
| `loading-flow.spec.ts` | 2 | Loading states and skeletons |
| `bead-selection.spec.ts` | 4 | Bead interaction and filtering |
| `mobile.spec.ts` | 4 | Mobile responsive behavior |
| `terminal-flow.spec.ts` | 3 | Terminal access modal |
| `pwa.spec.ts` | 3 | PWA manifest and offline |
| `execution-status.spec.ts` | 3 | Real-time updates |
| **Total** | **31** | Comprehensive MVP coverage |

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

## Test Isolation

**Critical for agents:** Never pollute shared state with test data. Always use isolated environments.

### Backend Isolation Patterns

```python
# Pattern 1: Use pytest's tmp_path fixture (preferred)
def test_creates_project_structure(tmp_path):
    """Test uses isolated temp directory that's auto-cleaned."""
    project_dir = tmp_path / "test-project"
    project_dir.mkdir()

    result = create_project(str(project_dir))

    assert (project_dir / ".git").exists()

# Pattern 2: Use environment variable for database
# Set TEST_DATABASE_URL to override production database
@pytest.fixture
def isolated_db(tmp_path):
    """Create isolated SQLite database."""
    db_path = tmp_path / "test.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    yield db_path
    del os.environ["DATABASE_URL"]

# Pattern 3: Use unique prefixes for test data
def test_creates_bead_with_unique_id(db_session):
    """Use unique IDs to prevent collision with other tests."""
    unique_id = f"test-{uuid.uuid4().hex[:8]}"
    bead = create_bead(id=unique_id, title="Test bead")
    # Test data won't collide with other parallel tests
```

### Frontend Isolation Patterns

```typescript
// Pattern 1: Use MSW to mock API (no real network calls)
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Pattern 2: Reset component state between tests
afterEach(() => {
  cleanup();  // RTL cleanup
  vi.clearAllMocks();  // Clear mock call history
});

// Pattern 3: Use unique keys for localStorage tests
it('should persist state', () => {
  const key = `test-${Date.now()}`;  // Unique per test run
  localStorage.setItem(key, 'value');
  // ...
  localStorage.removeItem(key);  // Cleanup
});
```

### Docker/Container Isolation

```python
# For tests that create real containers
@pytest.fixture
def isolated_container(docker_client):
    """Create container that's auto-removed after test."""
    container = docker_client.containers.run(
        "test-image",
        detach=True,
        labels={"test": "true"},  # Label for easy cleanup
    )
    yield container
    container.remove(force=True)

# Bulk cleanup for CI (in conftest.py)
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_containers(docker_client):
    """Remove all test containers after test session."""
    yield
    for container in docker_client.containers.list(filters={"label": "test=true"}):
        container.remove(force=True)
```

### What NOT to Do

```python
# BAD: Uses shared/production database
def test_creates_user():
    db = get_production_database()  # Never do this!
    db.create_user("test@example.com")

# BAD: Hardcoded paths that might exist
def test_reads_config():
    config = read_config("/home/user/.config/app")  # What if this exists?

# BAD: No cleanup of created resources
def test_creates_file():
    open("/tmp/test-file.txt", "w").write("test")  # Leaks!
```

---

## Handling Known Broken Tests

If you encounter a failing test that's a known issue:

1. **Check `.test-skip`** in the project root
2. **If listed:** The test is known broken, move on
3. **If not listed and you can't fix it:**
   - File a GitHub issue
   - Add to `.test-skip`:
     ```
     # Issue #NNN: Brief description
     test_name_pattern
     ```

The `.test-skip` file supports regex patterns and is read by test scripts.

---

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
- [../.claude/test-strategy.md](../.claude/test-strategy.md) - Quick reference for agents
- [SIMPLIFIED_PLAN.md](./SIMPLIFIED_PLAN.md) - Test stack in MVP spec
