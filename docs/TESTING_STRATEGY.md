# Testing Strategy: Confidence Contract

> **Goal**: Be confident the app works when you open your phone and have Claude work on issues.

This document defines what "the app works" means and how tests verify it.

## What This App Does (The Contract)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Phone     │────▶│   Frontend   │────▶│   Backend    │────▶│   Docker     │
│   (Browser)  │     │   (Vite)     │     │  (FastAPI)   │     │  (Claude)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                           │                     │                     │
                           ▼                     ▼                     ▼
                      UI renders           API responds          Claude executes
                      Project list         Beads from .jsonl     Commands run
                      Bead selection       Container lifecycle   Output streams
                      Action buttons       Progress polling      Results return
```

## The 5 Things That Must Work

| # | Capability | User Story | Test Category |
|---|------------|------------|---------------|
| 1 | **UI Loads** | I open the app on my phone and see my projects | Frontend smoke |
| 2 | **API Responds** | When I tap things, the backend answers | API integration |
| 3 | **Beads Load** | I can see my issues from the .jsonl file | Beads integration |
| 4 | **Container Runs** | Claude starts in Docker when I trigger work | Docker integration |
| 5 | **Commands Execute** | Claude receives and runs the prompt I send | E2E integration |

---

## CI vs Local: The Testing Reality

**CRITICAL FOR AGENTS**: Not all tests can run in GitHub Actions.

### Environment Capabilities

| Environment | Docker | Claude API | Real Execution | What Runs |
|-------------|--------|------------|----------------|-----------|
| **GitHub CI** | Limited* | No | No | Mocked tests only |
| **Local Dev** | Yes | Yes | Yes | Everything |

*GitHub Actions can run Docker-in-Docker, but we don't have Claude API access there.

### Test Categories by Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub CI (Always runs)                     │
├─────────────────────────────────────────────────────────────────┤
│  Backend unit tests (mocked Docker)                              │
│  Backend integration tests (mocked Docker, TestClient)           │
│  Frontend unit tests (MSW mocks API)                             │
│  Frontend E2E tests (mocked backend responses)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Local Only (@pytest.mark.docker)              │
├─────────────────────────────────────────────────────────────────┤
│  Real Docker container creation                                  │
│  Real command execution in containers                            │
│  Real file I/O through container mounts                          │
│  Real Claude CLI execution (if API key available)                │
└─────────────────────────────────────────────────────────────────┘
```

### What CI Tests Actually Verify

**CI tests prove:**
- Code compiles without errors
- Logic works with expected mock inputs/outputs
- API contracts are correct (request/response shapes)
- Components render properly
- No regressions in existing functionality

**CI tests DO NOT prove:**
- Docker actually starts containers
- Commands actually reach Claude
- Real file I/O works through mounts
- The full phone → Claude path works

### Implications for Development

1. **Green CI ≠ App Works** - CI passing is necessary but not sufficient
2. **Run `pytest -m docker` locally** - Before any deploy, run real Docker tests
3. **Manual smoke test** - Periodically verify phone → work flow manually
4. **Mock boundaries, not internals** - Mock at Docker/Claude boundary, test everything else for real

### For Agents: Test Writing Rules

When writing new tests:

```python
# CI-SAFE: Mock Docker client
@patch('app.services.containers.docker')
def test_container_creation_logic(mock_docker):
    mock_docker.containers.run.return_value = Mock(id="abc123")
    # Test logic without real Docker

# LOCAL-ONLY: Real Docker required
@pytest.mark.docker
def test_real_container_execution():
    # This test will be SKIPPED in CI
    # Only runs when Docker is available locally
```

```typescript
// CI-SAFE: MSW mocks the API
it('should display beads from API', async () => {
  // MSW intercepts fetch, returns mock data
  render(<BeadList projectId="test" />);
  expect(await screen.findByText('Mock Bead')).toBeInTheDocument();
});

// E2E with mocked backend (CI-safe)
test('work flow shows output', async ({ page }) => {
  await page.route('/api/projects/*/work/*', route => {
    route.fulfill({ json: { output: 'Mocked output', state: 'completed' } });
  });
  // Test UI behavior with mocked responses
});
```

---

## Test Tiers (Ordered by Importance)

### Tier 1: Critical Path Tests (MUST PASS)

These tests verify the core user journey works. If any fail, the app is broken.

#### 1.1 Backend Health (API is alive)
```bash
# Test: Backend responds to requests
pytest backend/tests/integration/test_api_health.py -v
```

**What it verifies:**
- FastAPI server starts
- `/health` endpoint returns 200
- Basic routing works

#### 1.2 Projects Load (Can see your repos)
```bash
# Test: Project listing works
pytest backend/tests/integration/test_api_projects.py -v
```

**What it verifies:**
- Backend scans workspace directory
- Returns list of git repos
- Indicates which have .beads initialized

#### 1.3 Beads Load (Can see your issues)
```bash
# Test: Beads read from .jsonl
pytest backend/tests/unit/test_beads.py -v
pytest backend/tests/integration/test_api_beads.py -v
```

**What it verifies:**
- `bd list` command executes
- Output parsed correctly (ID, title, status, priority, type)
- Status filtering works (open, in_progress, closed)
- Returns empty list gracefully (not error)

#### 1.4 Container Lifecycle (Docker works)
```bash
# Test: Can create/manage containers
pytest backend/tests/unit/test_containers.py -v
pytest -m docker -v  # Real Docker tests (requires Docker running)
```

**What it verifies:**
- Docker client connects
- Container creates with correct mounts (project, .ssh, .gitconfig)
- Container starts/stops/removes cleanly
- Execution commands reach container

#### 1.5 Full Execution (Claude runs commands)
```bash
# Test: End-to-end command execution
pytest backend/tests/integration/test_exec_claude.py -v -m docker
```

**What it verifies:**
- Container starts for project
- Command sent to container
- Output captured and returned
- Exit state detected (completed, failed, blocked)

---

### Tier 2: UI Tests (User Experience)

These verify the phone interface works.

#### 2.1 UI Renders (App loads on phone)
```bash
# Test: Frontend builds and renders
cd frontend && npm run test:run
```

**What it verifies:**
- Components render without crashing
- Loading/empty/error states display
- Buttons respond to clicks
- Output view shows results

#### 2.2 API Integration (Frontend talks to backend)
```bash
# Test: API client works
cd frontend && npm run test:run -- api.test.ts
```

**What it verifies:**
- Fetch calls succeed
- Error responses handled
- Response data parsed correctly

#### 2.3 E2E User Flows (Full journey works)
```bash
# Test: Complete user journeys
cd frontend && npx playwright test
```

**What it verifies:**
- Project selection → Bead listing
- Bead selection → Work button enabled
- Work click → Execution starts → Output appears
- Review and Push/PR flows work

---

### Tier 3: Edge Cases (Robustness)

These prevent weird failures.

#### 3.1 Security (Can't break out)
```bash
# Test: Path traversal blocked
pytest backend/tests/unit/test_projects.py -k "traversal" -v
```

**What it verifies:**
- `../` paths rejected
- URL-encoded traversal blocked
- Only workspace projects accessible

#### 3.2 Error Handling (Fails gracefully)
```bash
# Test: Errors don't crash app
pytest backend/tests -k "error or fail or invalid" -v
```

**What it verifies:**
- Invalid project returns 404, not 500
- Missing beads returns empty list
- Container errors return useful message

---

## Running the Tests

### Quick Check (30 seconds)
```bash
# Run before any change
cd backend && source .venv/bin/activate && python3 -m pytest tests/unit -q
cd frontend && npm run test:run -- --reporter=dot
```

### Full Validation (2 minutes)
```bash
# Run before committing
cd backend && source .venv/bin/activate && python3 -m pytest tests/ -v
cd frontend && npm run test:run
```

### With Real Docker (5 minutes)
```bash
# Run when touching container logic
cd backend && source .venv/bin/activate && python3 -m pytest -m docker -v
```

### Full E2E (10 minutes)
```bash
# Run before deploying or after major changes
# Requires both backend and frontend running
cd frontend && npx playwright test
```

---

## Test Health Dashboard

Use this checklist to assess test confidence:

### Critical Path Coverage

| Test | File | Count | Coverage |
|------|------|-------|----------|
| Health check | `test_api_health.py` | 1 | Endpoint alive |
| Project listing | `test_api_projects.py` | 8 | List, get, errors |
| Beads parsing | `test_beads.py` | 34 | Parse, convert, errors |
| Beads API | `test_api_beads.py` | 15 | Endpoints, filtering |
| Container service | `test_containers.py` | 41 | Create, exec, cleanup |
| Container API | `test_api_actions.py` | 25 | Work, review, push |
| Real Docker | `test_exec_claude.py` | 20 | Actual execution |

**Total critical tests: ~144**

### UI Coverage

| Test | File | Count | Coverage |
|------|------|-------|----------|
| API client | `api.test.ts` | 25 | All endpoints |
| ActionBar | `ActionBar.test.tsx` | 15 | Button states |
| BeadList | `BeadList.test.tsx` | 12 | Selection, display |
| OutputView | `OutputView.test.tsx` | 14 | States, styling |
| ProjectList | `ProjectList.test.tsx` | 14 | Selection, display |
| TerminalEmbed | `TerminalEmbed.test.tsx` | 20 | Modal, copy |

**Total UI tests: ~100**

### E2E Coverage

| Flow | File | Count | Coverage |
|------|------|-------|----------|
| Smoke | `smoke.spec.ts` | 5 | App loads |
| Projects | `project-selection.spec.ts` | 7 | Selection |
| Beads | `bead-listing.spec.ts` | 8 | Display, filter |
| Work | `work-execution.spec.ts` | 8 | Execution |
| Review | `review-flow.spec.ts` | 6 | Review action |
| Push/PR | `push-pr-flow.spec.ts` | 8 | PR creation |
| Terminal | `terminal-access.spec.ts` | 6 | Modal |

**Total E2E tests: ~48**

---

## What Passing Tests Guarantee

### High Confidence
- UI loads and renders on mobile
- Backend API responds to all endpoints
- Beads read correctly from .jsonl files
- Projects detected from workspace
- Docker containers start and stop
- Commands reach running containers
- Output streams back to UI
- Error states handled gracefully

### Medium Confidence
- Real Claude CLI execution (mocked in most tests)
- GitHub API calls for PR creation (mocked)
- Long-running execution reliability

### Not Tested
- Actual Claude AI responses (would need real API key)
- Network resilience (intermittent connections)
- Multi-user concurrent access (single-user app)

---

## When to Run Which Tests

| Scenario | Command | Time |
|----------|---------|------|
| Changed backend service | `pytest tests/unit/test_<service>.py` | 5s |
| Changed API endpoint | `pytest tests/integration/test_api_*.py` | 15s |
| Changed frontend component | `npm test -- <Component>.test.tsx` | 5s |
| Changed Docker logic | `pytest -m docker` | 60s |
| Before committing | Full validation (above) | 2m |
| Before deploying | Full E2E | 10m |
| Something feels broken | `pytest -m smoke && npm test:run` | 30s |

---

## Test Gaps to Accept

These are known limitations we accept:

1. **Real Claude not tested** - We mock Claude CLI output. Actually running Claude would require API credits and take minutes per test.

2. **GitHub API mocked** - Push/PR creation uses mocks. Real GitHub calls would need auth and create real PRs.

3. **Single browser** - E2E only tests Chrome. Safari/Firefox could behave differently.

4. **No load testing** - App designed for single user (you on your phone), so no concurrent load tests.

5. **No offline testing** - Network failures not comprehensively tested (acceptable for home network use).

---

## Adding New Tests

When adding features, follow this pattern:

### Backend Feature
1. Add unit test in `tests/unit/test_<service>.py`
2. Add integration test in `tests/integration/test_api_<endpoint>.py`
3. If touching Docker, add `@pytest.mark.docker` test

### Frontend Feature
1. Add component test in `tests/components/<Component>.test.tsx`
2. Update mock handlers if new API calls
3. Add E2E test if new user flow

### Beads Feature
1. Unit test parsing in `test_beads.py`
2. Integration test endpoint in `test_api_beads.py`
3. Verify .jsonl is read correctly (not modified unless intended)

---

## Confidence Statement

**If all tests pass, you can confidently:**
- Open the app on your phone
- See your projects and their beads
- Select a bead and trigger work
- Watch output stream back
- Have Claude execute in Docker
- Create PRs from your phone

**What could still break:**
- Claude API key invalid/expired
- Docker daemon not running
- Network connectivity issues
- GitHub authentication expired
