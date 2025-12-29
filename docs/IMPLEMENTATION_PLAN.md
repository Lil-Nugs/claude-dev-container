# Claude Dev Container - Implementation Plan

## Overview

Build a full-stack mobile-first system for managing software projects via Claude Code running in isolated Docker containers. Users can work on beads (issues) from their phone with automated review workflows and Git/PR automation.

**Stack**: FastAPI (backend) + React PWA (frontend) + Docker + Beads

## Critical Files to Create

### Phase 1: Foundation (Start Here)
1. `backend/app/config.py` - Configuration and settings
2. `backend/app/models.py` - Pydantic models for API
3. `backend/app/main.py` - FastAPI app entry point
4. `backend/app/services/project_discovery.py` - Scan ~/projects/ for repos
5. `backend/app/services/beads_service.py` - Beads CLI integration
6. `backend/app/api/projects.py` - Project endpoints
7. `backend/app/api/beads.py` - Beads endpoints
8. `frontend/src/types/index.ts` - TypeScript interfaces
9. `frontend/src/api/client.ts` - API client with Axios
10. `frontend/src/store/projectStore.ts` - Zustand state management
11. `frontend/src/components/ProjectList.tsx` - Project list view
12. `frontend/src/components/ProjectDetail.tsx` - Project detail with beads
13. `frontend/src/components/BeadCard.tsx` - Bead display component

**Milestone**: Browse projects and see beads from phone

### Phase 2: Container Management
14. `docker/base/Dockerfile` - Base container image
15. `docker/scripts/init-project.sh` - Container init script
16. `backend/app/services/container_manager.py` - Docker lifecycle management
17. Update `backend/app/api/projects.py` - Add container endpoints

**Milestone**: Start/stop containers for projects

### Phase 3: Bead Execution
18. `backend/app/services/claude_executor.py` - Execute Claude in containers
19. `backend/app/api/execution.py` - Execution endpoints
20. `frontend/src/store/executionStore.ts` - Execution state
21. `frontend/src/hooks/usePolling.ts` - Generic polling hook (5-10s interval)
22. `frontend/src/components/BeadExecutionModal.tsx` - Execution start modal
23. `frontend/src/components/StatusPolling.tsx` - Real-time status display

**Milestone**: Execute beads from phone with real-time progress

### Phase 4: Git Integration
24. `backend/app/services/git_service.py` - Branch/commit/PR operations
25. Update `backend/app/services/claude_executor.py` - Auto-create branches (beads-xxx-feature-name)

**Milestone**: Auto-create branches and commits for bead work

### Phase 5: Review Workflow
26. `backend/app/services/review_service.py` - Review orchestration
27. `backend/app/api/review.py` - Review endpoints
28. `frontend/src/components/ReviewPanel.tsx` - Review UI

**Milestone**: Review work and auto-create beads for issues

### Phase 6: PR Creation
29. `backend/app/api/pr.py` - PR creation endpoints
30. `frontend/src/components/PRDialog.tsx` - PR creation dialog

**Milestone**: Complete workflow (work → review → PR)

### Phase 7: PWA Polish
31. `frontend/public/manifest.json` - PWA manifest
32. `frontend/vite.config.ts` - Vite + PWA plugin config
33. `frontend/public/service-worker.js` - Service worker for offline support

**Milestone**: Production-ready installable PWA

## Project Structure

```
claude-dev-container/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Settings (workspace path, Docker config)
│   │   ├── models.py                  # Pydantic models
│   │   ├── api/
│   │   │   ├── projects.py            # GET /projects, POST /ensure-container
│   │   │   ├── beads.py               # GET/PATCH beads
│   │   │   ├── execution.py           # POST execute, GET status (polling)
│   │   │   ├── review.py              # POST review, GET status
│   │   │   └── pr.py                  # POST create PR
│   │   ├── services/
│   │   │   ├── project_discovery.py   # Scan ~/projects/
│   │   │   ├── container_manager.py   # Docker lifecycle
│   │   │   ├── beads_service.py       # bd CLI wrapper
│   │   │   ├── claude_executor.py     # Execute Claude in containers
│   │   │   ├── git_service.py         # Git operations
│   │   │   └── review_service.py      # Review workflow
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts              # Axios API client
│   │   ├── components/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── BeadCard.tsx
│   │   │   ├── BeadExecutionModal.tsx
│   │   │   ├── StatusPolling.tsx      # Real-time updates
│   │   │   ├── ReviewPanel.tsx
│   │   │   └── PRDialog.tsx
│   │   ├── hooks/
│   │   │   └── usePolling.ts          # 5-10s polling hook
│   │   ├── store/
│   │   │   ├── projectStore.ts        # Zustand
│   │   │   └── executionStore.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   └── service-worker.js
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── base/
│   │   └── Dockerfile                 # Base image with tools
│   └── scripts/
│       └── init-project.sh            # Container init
└── docs/
```

## Key API Endpoints

### Projects
- `GET /api/v1/projects` - List all projects (scan ~/projects/)
- `GET /api/v1/projects/{id}` - Project detail
- `POST /api/v1/projects/{id}/ensure-container` - Start container

### Beads
- `GET /api/v1/projects/{id}/beads` - List beads (via `bd list --json`)
- `GET /api/v1/projects/{id}/beads/{bead_id}` - Bead detail
- `PATCH /api/v1/projects/{id}/beads/{bead_id}` - Update status

### Execution
- `POST /api/v1/projects/{id}/beads/{bead_id}/execute` - Start execution
  - Body: `{ context?: string, instructions?: string }`
  - Returns: `{ execution_id: string }`
- `GET /api/v1/executions/{execution_id}/status` - Poll status (every 5-10s)
  - Returns: `{ status, output, progress, branch_name }`

### Review
- `POST /api/v1/projects/{id}/review` - Start review
- `GET /api/v1/reviews/{review_id}/status` - Poll review status

### PR
- `POST /api/v1/projects/{id}/pr` - Create PR
  - Body: `{ title?, beads: string[], auto_review: bool }`
  - Returns: `{ pr_url, pr_number }`

## Container Setup

**Base Image** (`docker/base/Dockerfile`):
- Ubuntu 22.04
- Git, curl, build-essential
- Python 3, Node.js, npm
- Common dev tools

**Volume Mounts** (per project container):
- `{project_path}:/workspace` - Project code (read-write)
- `~/.claude:/home/claude/.claude:ro` - Claude config (read-only)
- `/usr/local/bin/claude:/usr/local/bin/claude:ro` - Claude CLI (read-only)
- `~/.gitconfig:/home/claude/.gitconfig:ro` - Git config (read-only)

**Resource Limits**:
- 4 CPU cores
- 8GB RAM
- Max ~3 concurrent containers

## Implementation Details

### 1. Executing Claude in Containers

```python
# backend/app/services/claude_executor.py

async def execute_bead(project: Project, bead: Bead, context: str = None) -> str:
    # 1. Ensure container running
    container = await container_manager.ensure_container(project)

    # 2. Create branch: beads-{bead.id}-{sanitized-title}
    await git_service.create_branch(project.path, branch_name)

    # 3. Build prompt from bead + optional context
    prompt = f"{bead.title}\n{bead.description}"
    if context:
        prompt += f"\n\nAdditional context: {context}"

    # 4. Execute Claude CLI in background
    exec_id = generate_execution_id()
    asyncio.create_task(_run_execution(container, prompt, exec_id))

    # 5. Return execution_id for polling
    return exec_id

async def _run_execution(container, prompt, exec_id):
    # Stream output to execution buffer
    async for line in execute_claude_in_container(container, prompt):
        executions[exec_id].output_buffer.append(line)

    # On completion: update bead status, run bd sync
    await beads_service.update_bead_status(bead_id, "done")
    await beads_service.sync_beads(project.path)
```

### 2. Polling for Status

Frontend polls `GET /executions/{id}/status` every 5-10 seconds:

```typescript
// frontend/src/hooks/usePolling.ts

export function usePolling(executionId: string, interval = 5000) {
  useEffect(() => {
    const timer = setInterval(async () => {
      const status = await api.getExecutionStatus(executionId);
      setStatus(status);

      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [executionId, interval]);
}
```

### 3. Review Workflow

```python
# backend/app/services/review_service.py

async def start_review(project: Project, beads: List[str]) -> str:
    # 1. Get git diff
    diff = await git_service.get_diff(project.path, base="main")

    # 2. Build review prompt
    prompt = f"""
Review the following changes for these beads:
{bead_context}

CHANGES:
{diff}

For each issue found, output:
BEAD: [title] | [description] | P[0-4]
"""

    # 3. Execute Claude review
    output = await execute_claude_in_container(container, prompt)

    # 4. Parse output for "BEAD: ..." markers
    bead_specs = parse_bead_markers(output)

    # 5. Create beads via bd CLI
    for spec in bead_specs:
        await beads_service.create_bead(
            project.path,
            spec.title,
            spec.description,
            spec.priority
        )
```

### 4. Branch Strategy

- Each bead gets own branch: `beads-{bead_id}-{sanitized-title}`
- Created automatically before Claude execution
- Multiple beads can be merged into one PR

### 5. PR Creation

```python
# backend/app/api/pr.py

async def create_pr(project_id: str, request: PRRequest):
    # 1. Auto-review if requested and not done
    if request.auto_review:
        await review_service.start_review(project, request.beads)

    # 2. Generate PR description from beads
    bead_context = await get_bead_descriptions(request.beads)

    # 3. Push branch
    await git_service.push_branch(project.path, current_branch)

    # 4. Create PR via gh CLI
    pr = await git_service.create_pr_via_gh(
        project.path,
        title=request.title or f"Work on {len(request.beads)} beads",
        body=bead_context
    )

    return pr
```

## Technical Challenges & Solutions

### Challenge: Long-running executions (up to 6 hours)
**Solution**: Background tasks + polling (not WebSockets)
- Execute in asyncio.create_task()
- Store state in memory dict
- Client polls every 5-10s
- 6 hour timeout for complex tasks
- Reliable over cellular/VPN

### Challenge: Container resource management (32GB / 3 containers)
**Solution**: Hard limits + manual cleanup
- 4 CPU, 8GB RAM per container
- Keep warm, allow manual cleanup
- Future: Queue if >3 concurrent

### Challenge: Mobile network reliability
**Solution**: Server-side execution + polling
- Work happens server-side
- Phone only monitors
- Show last known status on failure
- Exponential backoff

### Challenge: Review output parsing
**Solution**: Strict format + regex
- Prompt: "BEAD: [title] | [description] | P[0-4]"
- Regex parsing with tolerance
- Fallback: show output, manual creation

## Dependencies

### Backend (`requirements.txt`)
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
docker==7.0.0
GitPython==3.1.40
```

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.4",
    "vite-plugin-pwa": "^0.17.4",
    "typescript": "^5.3.2",
    "tailwindcss": "^3.3.5"
  }
}
```

## Development Workflow

```bash
# 1. Build base Docker image
docker build -t claude-dev-base:latest -f docker/base/Dockerfile .

# 2. Start backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Start frontend
cd frontend
npm install
npm run dev  # Port 5173

# 4. Access from phone via Tailscale
# http://<mini-pc-tailscale-ip>:5173
```

## Production Deployment

```bash
# Build frontend
cd frontend
npm run build

# Serve via FastAPI (static files from frontend/dist)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Access: http://<tailscale-ip>:8000
# Install as PWA on phone
```

## Authentication

**No auth needed** - Tailscale network membership = trusted
- Backend listens on 0.0.0.0 (all interfaces)
- Only accessible via Tailscale VPN
- Phone + Mini PC on same Tailscale network

## Next Steps

1. Create backend structure (Phase 1)
2. Implement project discovery and beads listing
3. Build frontend project/bead views
4. Test end-to-end: browse projects from phone
5. Implement container management
6. Add Claude execution
7. Iterate through phases 4-7

## File Count Summary

- Backend: ~15 Python files
- Frontend: ~15 TypeScript/React files
- Docker: 2 files (Dockerfile, init script)
- Config: 3 files (docker-compose, .env, requirements/package.json)
- Docs: 4 files (API, Architecture, Deployment, README)

**Total: ~40 files to create**
