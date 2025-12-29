# Simplified Implementation Plan (MVP)

**Date**: 2025-12-28
**Status**: Active - Primary implementation target

---

## Philosophy

**Your actual workflow:**
1. Create plan doc → iterate with Claude (interactive)
2. Break into beads when ready
3. Button: "Work on bead" → Claude works until tests pass
4. Button: "Review" → fresh Claude reviews work
5. Button: "Push/Complete/PR" → finalize
6. Drop into container if needed

**Key insight**: You're already in the loop. You don't need complex orchestration—you need buttons that trigger Claude with simple prompts, and the ability to intervene when needed.

---

## MVP Scope

### What We Build

| Component | Purpose | Files |
|-----------|---------|-------|
| **Backend** | REST endpoints + container management + tests | ~15 files |
| **Frontend** | UI components + tests | ~15 files |
| **Docker** | Base image + volume mounts | ~3 files |
| **E2E** | Critical path tests | ~3 files |

**Total: ~36 files, 6 epics, 23 beads**

### What We Skip (Future)

| Deferred Feature | Why Defer |
|------------------|-----------|
| ContextBuilder | Claude explores codebases itself |
| State machine/orchestrator | You watch output directly |
| Quality gates automation | You see test results |
| Review JSON parsing | You read Claude's output |
| Error recovery automation | You drop into container |
| Timeout enforcement | You cancel manually if stuck |
| Polling infrastructure | Use SSE or just wait for completion |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Phone (PWA)                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Projects│  │  Beads  │  │ Actions │  │Terminal │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  GET /projects    GET /beads    POST /work    GET /attach   │
│                                 POST /review                 │
│                                 POST /push-pr                │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /workspace (project)                                 │   │
│  │  Claude CLI (mounted)                                 │   │
│  │  Git credentials (mounted)                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + endpoints
│   ├── config.py            # Settings
│   ├── models.py            # Pydantic models (minimal)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── projects.py      # Scan ~/projects/
│   │   ├── beads.py         # bd CLI wrapper
│   │   └── containers.py    # Docker management
│   └── prompts.py           # Simple prompt templates
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── unit/
│   │   ├── test_projects.py
│   │   ├── test_beads.py
│   │   └── test_containers.py
│   ├── integration/
│   │   ├── test_api_projects.py
│   │   ├── test_api_beads.py
│   │   └── test_api_execution.py
│   └── fixtures/
│       ├── mock_docker.py
│       └── mock_beads.py
├── pytest.ini
├── requirements.txt
└── requirements-dev.txt     # pytest, pytest-asyncio, httpx
```

**~15 files total**

### Endpoints

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/projects` | List projects in ~/projects/ |
| `GET` | `/api/projects/{id}` | Project details + container status |
| `GET` | `/api/projects/{id}/beads` | List beads (calls `bd list`) |
| `POST` | `/api/projects/{id}/work/{bead_id}` | Run Claude on bead |
| `POST` | `/api/projects/{id}/review` | Run Claude review |
| `POST` | `/api/projects/{id}/push-pr` | Git push + gh pr create |
| `GET` | `/api/projects/{id}/attach` | Get container ID for docker exec |

### Simple Prompts

```python
# prompts.py

WORK_PROMPT = """
Work on bead {bead_id}: {title}

{description}

Workflow:
1. Implement the required changes
2. Write/update unit tests for new code
3. Run tests: {test_command}
4. If tests pass, commit: "Bead {bead_id}: {title}"
5. Push to remote

Test requirements:
- All new functions must have unit tests
- Mock external dependencies (Docker, CLI, APIs)
- Tests must pass before committing

If tests fail, fix them before proceeding.
If blocked, explain why and stop.
"""

REVIEW_PROMPT = """
Review the changes on this branch compared to main.

First, run the test suite: {test_command}

Then analyze:
1. **Test Coverage**: Are new functions tested? Missing test cases?
2. **Test Quality**: Do tests actually verify behavior?
3. **Code Quality**: Bugs, edge cases, security issues?
4. **Architecture**: Does it follow project patterns?

List any issues found. Be specific about file and line.
Create issues for: missing tests, failing tests, bugs, security concerns.
"""
```

### Core Services

#### `services/projects.py`

```python
from pathlib import Path
from app.config import settings

class ProjectService:
    def __init__(self):
        self.workspace = Path(settings.workspace_path).expanduser()

    def list_projects(self) -> list[dict]:
        """Scan workspace for git repos with beads"""
        projects = []
        for item in self.workspace.iterdir():
            if not item.is_dir() or not (item / ".git").exists():
                continue
            projects.append({
                "id": item.name,
                "name": item.name,
                "path": str(item),
                "has_beads": (item / ".beads").exists(),
            })
        return sorted(projects, key=lambda p: p["name"])
```

#### `services/beads.py`

```python
import subprocess
from pathlib import Path

class BeadsService:
    def list_beads(self, project_path: str, status: str = None) -> list[dict]:
        """Run bd list and parse output"""
        cmd = ["bd", "list"]
        if status:
            cmd.extend(["--status", status])

        result = subprocess.run(
            cmd, cwd=project_path, capture_output=True, text=True
        )
        # Parse bd output (text format)
        return self._parse_bd_list(result.stdout)

    def get_ready(self, project_path: str) -> list[dict]:
        """Run bd ready to get unblocked beads"""
        result = subprocess.run(
            ["bd", "ready"], cwd=project_path, capture_output=True, text=True
        )
        return self._parse_bd_list(result.stdout)
```

#### `services/containers.py`

```python
import docker
from app.config import settings

class ContainerService:
    def __init__(self):
        self.client = docker.from_env()
        self.containers = {}  # project_id -> container

    def ensure_container(self, project: dict) -> str:
        """Ensure container exists, return container ID"""
        if project["id"] in self.containers:
            container = self.containers[project["id"]]
            container.reload()
            if container.status == "running":
                return container.id

        # Create new container
        container = self._create_container(project)
        self.containers[project["id"]] = container
        return container.id

    def exec_claude(self, project_id: str, prompt: str) -> str:
        """Execute Claude CLI in container, return output"""
        container = self.containers[project_id]

        # Run claude with prompt
        exec_result = container.exec_run(
            cmd=["claude", "--dangerously-skip-permissions", "-p", prompt],
            workdir="/workspace",
            user="claude",
            demux=True,
        )

        stdout, stderr = exec_result.output
        return (stdout or b"").decode() + (stderr or b"").decode()

    def get_container_id(self, project_id: str) -> str:
        """Get container ID for docker exec attachment"""
        if project_id in self.containers:
            return self.containers[project_id].id
        return None
```

### Main App

```python
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.services.projects import ProjectService
from app.services.beads import BeadsService
from app.services.containers import ContainerService
from app.prompts import WORK_PROMPT, REVIEW_PROMPT

app = FastAPI(title="Claude Dev Container")

# Services
projects = ProjectService()
beads = BeadsService()
containers = ContainerService()

# CORS for PWA
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])

@app.get("/api/projects")
def list_projects():
    return projects.list_projects()

@app.get("/api/projects/{project_id}/beads")
def list_beads(project_id: str, status: str = None):
    project = projects.get_project(project_id)
    return beads.list_beads(project["path"], status)

@app.post("/api/projects/{project_id}/work/{bead_id}")
def work_on_bead(project_id: str, bead_id: str, context: str = ""):
    project = projects.get_project(project_id)
    bead = beads.get_bead(project["path"], bead_id)

    # Ensure container
    containers.ensure_container(project)

    # Build prompt
    prompt = WORK_PROMPT.format(
        bead_id=bead_id,
        title=bead["title"],
        description=bead["description"],
        test_command=detect_test_command(project["path"]),
    )
    if context:
        prompt += f"\n\nAdditional context:\n{context}"

    # Execute Claude (blocking - you watch the output)
    output = containers.exec_claude(project_id, prompt)

    return {"output": output}

@app.post("/api/projects/{project_id}/review")
def review_work(project_id: str):
    project = projects.get_project(project_id)
    containers.ensure_container(project)

    output = containers.exec_claude(project_id, REVIEW_PROMPT)
    return {"output": output}

@app.post("/api/projects/{project_id}/push-pr")
def push_and_pr(project_id: str, title: str = None):
    project = projects.get_project(project_id)
    containers.ensure_container(project)

    # Git push
    push_output = containers.exec_command(project_id, "git push -u origin HEAD")

    # Create PR
    pr_cmd = f'gh pr create --fill'
    if title:
        pr_cmd = f'gh pr create --title "{title}" --fill'

    pr_output = containers.exec_command(project_id, pr_cmd)

    return {"push": push_output, "pr": pr_output}

@app.get("/api/projects/{project_id}/attach")
def get_attach_info(project_id: str):
    """Return info needed to attach to container"""
    container_id = containers.get_container_id(project_id)
    if not container_id:
        raise HTTPException(404, "Container not running")

    return {
        "container_id": container_id,
        "command": f"docker exec -it {container_id[:12]} bash",
    }
```

---

## Frontend Implementation

### File Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api.ts                # Simple fetch wrapper
│   ├── components/
│   │   ├── ProjectList.tsx   # Grid of projects
│   │   ├── BeadList.tsx      # List of beads for project
│   │   ├── ActionBar.tsx     # Work | Review | Push | Terminal buttons
│   │   ├── OutputView.tsx    # Show Claude output
│   │   └── TerminalEmbed.tsx # ttyd or gotty embed
│   └── types.ts
├── tests/
│   ├── setup.ts              # Test setup, MSW handlers
│   ├── components/
│   │   ├── ProjectList.test.tsx
│   │   ├── BeadList.test.tsx
│   │   ├── ActionBar.test.tsx
│   │   └── OutputView.test.tsx
│   ├── api.test.ts
│   └── mocks/
│       └── handlers.ts       # MSW API mocks
├── e2e/
│   ├── playwright.config.ts
│   └── flows/
│       ├── project-selection.spec.ts
│       └── bead-execution.spec.ts
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tailwind.config.js
```

**~15 files total**

### Key Components

#### `ActionBar.tsx`

```tsx
interface Props {
  projectId: string;
  selectedBead: Bead | null;
  onOutput: (output: string) => void;
}

export function ActionBar({ projectId, selectedBead, onOutput }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleWork = async () => {
    if (!selectedBead) return;
    setLoading("work");
    const result = await api.workOnBead(projectId, selectedBead.id);
    onOutput(result.output);
    setLoading(null);
  };

  const handleReview = async () => {
    setLoading("review");
    const result = await api.review(projectId);
    onOutput(result.output);
    setLoading(null);
  };

  const handlePushPR = async () => {
    setLoading("push");
    const result = await api.pushAndPR(projectId);
    onOutput(`Push:\n${result.push}\n\nPR:\n${result.pr}`);
    setLoading(null);
  };

  const handleTerminal = async () => {
    const info = await api.getAttachInfo(projectId);
    // Open terminal embed or show command
    window.open(`/terminal/${projectId}`, '_blank');
  };

  return (
    <div className="flex gap-2 p-4 bg-gray-100 sticky bottom-0">
      <button
        onClick={handleWork}
        disabled={!selectedBead || loading !== null}
        className="flex-1 bg-blue-500 text-white py-3 rounded-lg disabled:bg-gray-300"
      >
        {loading === "work" ? "Working..." : "Work"}
      </button>

      <button
        onClick={handleReview}
        disabled={loading !== null}
        className="flex-1 bg-purple-500 text-white py-3 rounded-lg disabled:bg-gray-300"
      >
        {loading === "review" ? "Reviewing..." : "Review"}
      </button>

      <button
        onClick={handlePushPR}
        disabled={loading !== null}
        className="flex-1 bg-green-500 text-white py-3 rounded-lg disabled:bg-gray-300"
      >
        {loading === "push" ? "Pushing..." : "Push & PR"}
      </button>

      <button
        onClick={handleTerminal}
        className="bg-gray-800 text-white px-4 py-3 rounded-lg"
      >
        Terminal
      </button>
    </div>
  );
}
```

#### Terminal Embed Options

**Option A: ttyd (recommended)**
```bash
# Install ttyd on host
apt install ttyd

# Backend spawns ttyd for container
ttyd -p 7681 docker exec -it {container_id} bash
```

**Option B: gotty**
```bash
# Similar approach with gotty
gotty -p 7681 docker exec -it {container_id} bash
```

**Option C: Just show the command**
```tsx
// Simple: show command for user to run in their own terminal
<div className="bg-black text-green-400 p-4 rounded font-mono">
  docker exec -it {containerId} bash
</div>
```

---

## Docker Setup

### File Structure

```
docker/
├── Dockerfile              # Base image
└── scripts/
    └── healthcheck.sh      # Basic health check
```

### Dockerfile (Simplified)

```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Base tools
RUN apt-get update && apt-get install -y \
    git curl wget build-essential ca-certificates \
    openssh-client tree vim \
    python3.11 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Common dev tools
RUN npm install -g yarn pnpm typescript
RUN pip3 install pytest black

# Claude user
RUN useradd -m -s /bin/bash claude \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER claude
WORKDIR /workspace

CMD ["tail", "-f", "/dev/null"]
```

### Volume Mounts (in ContainerService)

```python
volumes = {
    project["path"]: {"bind": "/workspace", "mode": "rw"},
    "/usr/local/bin/claude": {"bind": "/usr/local/bin/claude", "mode": "ro"},
    os.path.expanduser("~/.claude"): {"bind": "/home/claude/.claude", "mode": "rw"},
    os.path.expanduser("~/.gitconfig"): {"bind": "/home/claude/.gitconfig", "mode": "ro"},
    os.path.expanduser("~/.ssh"): {"bind": "/home/claude/.ssh", "mode": "ro"},
}
```

---

## Implementation Epics

### Epic 1: Backend Foundation (5 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 1.1 | FastAPI skeleton + config + models | - |
| 1.2 | Project discovery service | Unit tests |
| 1.3 | Beads CLI wrapper service | Unit tests (mock bd CLI) |
| 1.4 | Project & bead API endpoints | Integration tests |
| 1.5 | pytest setup (conftest, fixtures, CI) | - |

### Epic 2: Container Management (4 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 2.1 | Dockerfile + base image build | - |
| 2.2 | Container manager service | Unit tests (mock Docker SDK) |
| 2.3 | Volume mounts (workspace, Claude CLI, git creds) | - |
| 2.4 | Claude execution in container | Integration test |

### Epic 3: Core Actions (4 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 3.1 | Work endpoint (execute Claude on bead) | Test with mock container |
| 3.2 | Review endpoint (fresh Claude review) | Test with mock container |
| 3.3 | Push & PR endpoint (git push + gh pr) | Test with mock git/gh |
| 3.4 | Attach endpoint (container access info) | Unit test |

### Epic 4: Frontend Foundation (4 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 4.1 | Vite + React + Tailwind + Vitest setup | - |
| 4.2 | API client | Unit tests (MSW mocking) |
| 4.3 | Project list component | Component tests |
| 4.4 | Bead list component | Component tests |

### Epic 5: Frontend Actions (3 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 5.1 | Action bar (Work, Review, Push, Terminal) | Component tests |
| 5.2 | Output display component | Component tests |
| 5.3 | Terminal embed (ttyd or command display) | Integration test |

### Epic 6: PWA & Polish (3 beads)

| Bead | Description | Tests |
|------|-------------|-------|
| 6.1 | PWA manifest + service worker | - |
| 6.2 | Mobile responsive styling | - |
| 6.3 | E2E tests (Playwright - critical paths) | E2E tests |

---

## Test Stack

| Layer | Tool | What to Test |
|-------|------|--------------|
| **Backend Unit** | pytest + pytest-asyncio | Services, utilities, models |
| **Backend Integration** | pytest + httpx | API endpoints with test client |
| **Backend Mocking** | pytest-mock, unittest.mock | Docker SDK, bd CLI, git |
| **Frontend Unit** | Vitest | Utilities, hooks, API client |
| **Frontend Component** | Vitest + React Testing Library | Component rendering, interactions |
| **Frontend Mocking** | MSW (Mock Service Worker) | API responses |
| **E2E** | Playwright | Critical user flows |

---

## CI/Pre-PR Checks

### GitHub Actions (`.github/workflows/test.yml`)

```yaml
name: Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements-dev.txt
      - run: cd backend && pytest --cov=app --cov-report=term-missing

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test
      - run: cd frontend && npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose up -d
      - run: cd frontend && npx playwright test
```

---

## Totals

| Epic | Beads | Focus |
|------|-------|-------|
| 1. Backend Foundation | 5 | API + services + pytest |
| 2. Container Management | 4 | Docker + execution |
| 3. Core Actions | 4 | Work/Review/Push endpoints |
| 4. Frontend Foundation | 4 | React + Vitest setup |
| 5. Frontend Actions | 3 | UI components |
| 6. PWA & Polish | 3 | Mobile + E2E |
| **Total** | **23** | **MVP Complete** |

---

## Future Enhancements

Once MVP is working, consider adding:

### Tier 1: Quality of Life
- [ ] SSE streaming for real-time output
- [ ] Execution history/logs
- [ ] Bead status auto-update after work
- [ ] `bd close` integration after successful work

### Tier 2: Automation
- [ ] ContextBuilder for richer prompts
- [ ] Timeout enforcement (6 hours)
- [ ] Quality gates (test must pass before close)
- [ ] Review → auto-create beads

### Tier 3: Full Orchestration
- [ ] State machine (QUEUED → RUNNING → COMPLETED)
- [ ] Concurrent execution (multiple beads)
- [ ] Error recovery automation
- [ ] Background execution with notifications

See **FUTURE_ENHANCEMENTS.md** for detailed plans on these features.

---

## Quick Start

After implementing the 23 beads:

```bash
# Build Docker image
cd docker && docker build -t claude-dev-base:latest .

# Run backend tests
cd backend && pytest

# Start backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run frontend tests
cd frontend && npm test

# Start frontend
cd frontend && npm run dev

# Run E2E tests (requires backend + frontend running)
cd frontend && npx playwright test

# Access from phone via Tailscale
# http://minipc.tailnet-xxxx.ts.net:5173
```

### Workflow

1. Open PWA on phone
2. Select project → see beads
3. Tap bead → tap "Work" → watch output
4. Tap "Review" → read Claude's review
5. If issues: create new beads manually (`bd create`)
6. If satisfied: tap "Push & PR"
7. If stuck: tap "Terminal" → debug manually

---

## Design Decisions (Simplified)

| Decision | MVP Choice | Future Option |
|----------|------------|---------------|
| Prompts | Simple templates | ContextBuilder |
| Execution | Blocking (wait for result) | Background + polling |
| Output | Single response | SSE streaming |
| Error handling | Manual (drop into terminal) | Automated retry |
| Review parsing | Human reads output | JSON → auto-create beads |
| Quality gates | Human verifies | Automated test checks |
| Concurrency | One at a time | Multiple parallel |

---

## See Also

- **FUTURE_ENHANCEMENTS.md** - Detailed plans for automation features
- **CONTAINER_PLAN.md** - Full container setup details (use simplified version for MVP)
- **DESIGN_DECISIONS.md** - Original architecture decisions
