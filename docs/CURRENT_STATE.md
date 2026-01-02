# Claude Dev Container - Current State

> Last updated: 2026-01-02
> Purpose: Alignment document for AI agents working on this project

## What This Project Does

A **mobile-first PWA** that lets you manage software projects via AI-powered Claude agents in Docker containers. From your phone (via Tailscale), you can:

1. Browse projects in `~/projects/` directory
2. View open beads (tasks/issues) for each project
3. Click **Work** to have Claude tackle a task in a container
4. Click **Review** to have Claude review the changes
5. Click **Push & PR** to create a GitHub pull request
6. Drop into the container terminal if you need to intervene

**Architecture**: Mini PC at home running FastAPI backend + Docker, accessed over Tailscale from phone.

---

## Current Implementation Status

### MVP Completion: 95% (72/76 beads closed)

| Epic | Status | What It Does |
|------|--------|--------------|
| Epic 1: Backend Foundation | CLOSED 5/5 | FastAPI app, project discovery, beads CLI wrapper |
| Epic 2: Container Management | CLOSED 4/4 | Dockerfile, Docker SDK, volume mounts |
| Epic 3: Core Actions | CLOSED 4/4 | Work/Review/Push-PR/Attach endpoints |
| Epic 4: Frontend Foundation | CLOSED 4/4 | React app, API client, components |
| Epic 5: Frontend Actions | CLOSED 3/3 | ActionBar, OutputView, TerminalEmbed |
| Epic 6: PWA & Polish | CLOSED 3/3 | PWA manifest, service worker, E2E tests |

### Open Issues (4 remaining - all polish, not blockers)

| Bead ID | Priority | Type | Description |
|---------|----------|------|-------------|
| `claude-dev-container-jfn` | P2 | Bug | E2E tests route mocking broken |
| `claude-dev-container-8a6` | P3 | Task | OpenAPI documentation enhancements |
| `claude-dev-container-jmr` | P3 | Task | Structured logging |
| `claude-dev-container-v4y` | P3 | Task | Vite security update |

---

## Test Results (2026-01-02)

### Backend Tests: 163 passed, 1 skipped

```
tests/unit/test_beads.py       - 34 tests - BeadsService bd CLI wrapper
tests/unit/test_containers.py  - 41 tests - ContainerService Docker operations
tests/unit/test_projects.py    - 23 tests - ProjectService + path traversal security
tests/integration/test_api_*   - 65 tests - All API endpoints + security
```

**What they verify:**
- API endpoints return correct responses with mocked data
- BeadsService correctly parses `bd` CLI output
- ContainerService makes correct Docker SDK calls
- Path traversal attacks blocked (9 security tests)
- Shell injection attacks escaped (2 security tests)
- Execution state detection (completed/blocked/failed/cancelled)

### Frontend Tests: 117 passed

```
tests/api.test.ts                 - 22 tests - API client operations
tests/components/ActionBar.test   - 22 tests - Button states and callbacks
tests/components/BeadList.test    - 16 tests - Bead display and selection
tests/components/OutputView.test  - 21 tests - Output display states
tests/components/ProjectList.test - 12 tests - Project display
tests/components/TerminalEmbed    - 24 tests - Terminal modal
```

**What they verify:**
- Components render correctly
- User interactions work (click, select)
- API client handles success/error cases
- State changes propagate correctly

### E2E Tests: BROKEN (Two Issues)

**Issue 1 - Local Environment:**
- **Problem**: Missing browser dependencies (`libatk-1.0.so.0`)
- **Impact**: Cannot run Playwright tests locally
- **Fix**: Run `npx playwright install-deps` or install Chromium dependencies

**Issue 2 - CI Environment (bead `jfn`):**
- **Problem**: 53/58 tests fail - Playwright route mocks don't intercept API requests
- **Symptoms**: Tests wait for `[data-testid="project-list"]`, times out after 10s
- **Root cause**: Unknown - Vite proxy or service worker interference suspected
- **Attempted fixes that didn't work**:
  - Increased timeouts
  - Changed route patterns to `**/api/` globs
  - Disabled PWA service worker
  - Added `serviceWorkers: 'block'` to Playwright config

---

## Test Confidence Assessment

### What IS Tested (High Confidence)

| Area | Confidence | Reason |
|------|------------|--------|
| API endpoints work | HIGH | 65 integration tests with mocked services |
| Beads parsing | HIGH | 34 unit tests covering all bd output formats |
| Docker SDK calls | HIGH | 41 unit tests with mocked Docker client |
| Security | HIGH | 11 tests for path traversal + shell injection |
| UI renders | HIGH | 117 component tests |
| State transitions | HIGH | ExecutionState enum handling tested |

### What is NOT Tested (Gaps for AI Agent Confidence)

| Area | Confidence | Gap |
|------|------------|-----|
| Real Claude execution | NONE | Only mocked - requires API key |
| Real Docker in CI | NONE | Mocked to avoid Docker dependency |
| End-to-end with real container | LOW | Only `@pytest.mark.docker` local tests |
| Claude actually modifying files | NONE | Not verified in any test |
| Git commit/push/PR | NONE | GitHub operations mocked |
| Concurrent executions | NONE | Not tested |
| Long-running tasks | NONE | Not tested |
| Network failures mid-execution | NONE | Not tested |

### Critical Question: "Are tests sufficient for AI agent confidence?"

**Answer: Partially.**

- **Sufficient for**: API contracts, data parsing, security boundaries, UI behavior
- **Insufficient for**: Actual Claude execution, container file operations, git workflows

**Recommendation**: Before deploying AI agents, manually verify:
1. Claude responds in container
2. Claude can read project files
3. Claude can write changes
4. Git commits work
5. PR creation works

---

## Backend Features

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/projects` | GET | List all projects |
| `/api/projects/{id}` | GET | Get single project |
| `/api/projects/{id}/beads` | GET | List beads (with status filter) |
| `/api/projects/{id}/work/{bead_id}` | POST | Execute Claude on bead |
| `/api/projects/{id}/review` | POST | Review changes |
| `/api/projects/{id}/push-pr` | POST | Git push + create PR |
| `/api/projects/{id}/progress` | GET | Get execution progress |
| `/api/projects/{id}/attach` | GET | Get container attach info |

### Container Management

- One container per project (cached, reused)
- Volume mounts:
  - Project → `/workspace` (read-write)
  - Claude CLI → `/usr/local/bin/claude` (read-only)
  - `~/.claude` → `/home/claude/.claude` (read-write)
  - `~/.gitconfig` → `/home/claude/.gitconfig` (read-only)
  - `~/.ssh` → `/home/claude/.ssh` (read-only)

### Prompts (VERY MINIMAL)

```python
WORK_PROMPT = """You are implementing bead {bead_id}: {bead_title}

## Task Description
{bead_description}

## Project Location
{project_path}

## Instructions
1. Review the task requirements
2. Implement the necessary changes
3. Test your implementation
4. Report completion status
"""
```

**Missing from prompts:**
- No CLAUDE.md context injection
- No git workflow instructions (branch naming, commit style)
- No test-first guidance
- No beads CLI usage instructions
- No PR creation guidance

---

## Frontend Features

### Components

| Component | Purpose |
|-----------|---------|
| `ProjectList` | Shows projects from ~/projects/ |
| `BeadList` | Shows beads for selected project with status filter |
| `ActionBar` | Work/Review/Push-PR/Terminal buttons |
| `OutputView` | Shows execution output with state styling |
| `TerminalEmbed` | Modal with docker exec command |

### PWA Features

- Installable on mobile
- Service worker for offline capability
- Mobile-responsive design (44px touch targets)

---

## Verification Checklist

Use this checklist to manually verify the system works:

### Frontend Loads
- [ ] Open http://minipc:5173
- [ ] See project list load
- [ ] Projects show correct names and beads badge

### Beads Load
- [ ] Select a project with beads
- [ ] See bead list populate
- [ ] Status filter dropdown works

### Container Launches
- [ ] Select a bead, click Work
- [ ] Run `docker ps` - see container
- [ ] Container has project mounted

### Claude Responds
- [ ] See output appear in OutputView
- [ ] Output shows Claude working on task
- [ ] Execution completes (green border)

### Claude Modifies Files
- [ ] After work, check `git status` in project
- [ ] See actual file changes

### Git Works
- [ ] Claude commits changes
- [ ] Click Push PR
- [ ] PR appears on GitHub

---

## Known Issues Summary

| Issue | Severity | Workaround |
|-------|----------|------------|
| E2E tests broken (route mocking) | Medium | Skip E2E, rely on unit/integration tests |
| E2E deps missing locally | Low | Run `npx playwright install-deps` |
| Prompts too minimal | Medium | Claude may not follow project conventions |
| Real Docker not tested in CI | Medium | Run `pytest -m docker` locally before deploy |

---

## Files Reference

### Backend Core
- `backend/app/main.py` - All API endpoints
- `backend/app/services/containers.py` - Docker management
- `backend/app/services/beads.py` - bd CLI wrapper
- `backend/app/prompts.py` - Claude prompt templates

### Frontend Core
- `frontend/src/App.tsx` - Main app component
- `frontend/src/api.ts` - API client
- `frontend/src/components/` - All UI components

### Tests
- `backend/tests/unit/` - Unit tests
- `backend/tests/integration/` - API tests
- `frontend/tests/` - Component tests
- `frontend/e2e/flows/` - E2E tests (broken)

### Documentation
- `docs/TESTING_STRATEGY.md` - Test philosophy
- `docs/SIMPLIFIED_PLAN.md` - Original MVP spec
- `docs/DESIGN_DECISIONS.md` - Architecture rationale
