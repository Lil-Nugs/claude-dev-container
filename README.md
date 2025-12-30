# Claude Dev Container

A mobile PWA for launching Claude Code in Docker containers. Pick a project, pick a task, press a button, watch Claude work.

## How It Works

```
Phone (PWA) → FastAPI Backend → Docker Container (Claude CLI + project)
```

1. Select a project from `~/projects/`
2. Pick a bead (task) to work on
3. Tap "Work" - Claude implements it in a container
4. Tap "Review" - fresh Claude reviews the changes
5. Tap "Push & PR" when ready
6. Tap "Terminal" to drop in manually if needed

## Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React + Vite + Tailwind (TypeScript)
- **Containers**: Ubuntu + dev tools + Claude CLI mount
- **Issue tracking**: [beads](https://github.com/beads-project/beads) CLI

## Quick Start

```bash
# Backend
cd backend && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt -r requirements-dev.txt && python3 -m uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## API

| Endpoint | Action |
|----------|--------|
| `GET /api/projects` | List projects |
| `GET /api/projects/{id}/beads` | List tasks |
| `POST /api/projects/{id}/work/{bead_id}` | Run Claude on task |
| `POST /api/projects/{id}/review` | Run review |
| `POST /api/projects/{id}/push-pr` | Push + create PR |

## Docs

- `docs/SIMPLIFIED_PLAN.md` - Full MVP spec
- `AGENT_INSTRUCTIONS.md` - Development guide
