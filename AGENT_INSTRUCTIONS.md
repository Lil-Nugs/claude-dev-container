# Detailed Agent Instructions

**For project overview and quick start, see [AGENTS.md](AGENTS.md)**

This document contains detailed operational instructions for AI agents working on Claude Dev Container development.

## Development Guidelines

### Code Standards

**Backend (Python)**
- **Python version**: 3.11+
- **Type hints**: Required for all function signatures
- **Linting**: `ruff check .` and `ruff format --check .`
- **Testing**: `pytest` for all tests (see `docs/TESTING_GUIDE.md`)
- **Style**: PEP 8, 88 char line limit (Black/Ruff default)

**Frontend (TypeScript/React)**
- **Node version**: 20+
- **TypeScript**: Strict mode enabled
- **Linting**: `npm run lint` (ESLint)
- **Testing**: `vitest` for unit/integration tests
- **Style**: Prettier defaults

**General**
- **Documentation**: Update relevant .md files when behavior changes
- **Naming**: snake_case for Python, camelCase for TypeScript
- **Imports**: Absolute imports preferred, group by stdlib/third-party/local

### File Organization

```
claude-dev-container/
├── AGENTS.md                # Entry point for agents
├── AGENT_INSTRUCTIONS.md    # This file - detailed instructions
├── docs/                    # Planning and architecture
│   ├── SIMPLIFIED_PLAN.md   # MVP implementation target
│   ├── TESTING_GUIDE.md     # How to write and run tests
│   └── ...
├── backend/                 # FastAPI backend (Python)
│   ├── README.md            # Backend overview
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   └── schemas/         # Pydantic models
│   └── tests/
├── frontend/                # React PWA (TypeScript)
│   ├── README.md            # Frontend overview
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── api/             # API client
│   └── tests/
├── docker/                  # Container configuration
│   ├── README.md            # Container overview
│   └── Dockerfile
└── examples/                # Workflow examples
```

### Error Handling Patterns

**Backend (Python)**
```python
from fastapi import HTTPException

# Use HTTPException for API errors
if not project:
    raise HTTPException(status_code=404, detail="Project not found")

# Log internal errors, return generic message
try:
    result = risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(status_code=500, detail="Internal error")
```

**Frontend (TypeScript)**
```typescript
// Use try/catch with typed errors
try {
  const result = await api.startExecution(projectId, beadId);
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
  throw error;
}
```

### Testing Workflow

See `docs/TESTING_GUIDE.md` for complete testing documentation.

**Quick Reference:**
```bash
# Backend tests
cd backend
pytest                        # All tests
pytest tests/unit/            # Unit tests only
pytest -x                     # Stop on first failure
pytest --cov=app              # With coverage

# Frontend tests
cd frontend
npm test                      # All tests (watch mode)
npm run test:run              # Single run
npm run test:coverage         # With coverage
```

**Test File Naming:**
- Backend: `tests/unit/test_*.py`, `tests/integration/test_*.py`
- Frontend: `*.test.ts`, `*.test.tsx`

### Before Committing

1. **Run tests**: Relevant tests for changed code
2. **Run linter**: `ruff check .` (backend), `npm run lint` (frontend)
3. **Update docs**: If you changed behavior
4. **Commit**: Include bead ID if working on a bead

### Commit Message Convention

Include the bead ID in parentheses at the end when working on beads:

```bash
git commit -m "Add project listing endpoint (beads-001)"
git commit -m "Fix container startup race condition (beads-042)"
```

For non-bead work:
```bash
git commit -m "Update README with setup instructions"
git commit -m "Fix typo in error message"
```

### Git Workflow

**Branch Naming:**
- Beads work: `beads-xxx-description` (e.g., `beads-001-backend-foundation`)
- Features: `feature/description`
- Fixes: `fix/description`

**Protected Main Branch:**
- Never push directly to `main`
- Always create PRs
- Ensure CI passes before merging

## Landing the Plane

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File beads issues for remaining work** that needs follow-up
2. **Run quality gates** (if code changed):
   ```bash
   # Backend
   cd backend && ruff check . && pytest

   # Frontend
   cd frontend && npm run lint && npm test
   ```
3. **Update beads issues** - close finished work, update status:
   ```bash
   bd close <id1> <id2> --reason "Completed"
   bd update <id> --status in_progress
   ```
4. **PUSH TO REMOTE** - MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

**Example session end:**
```bash
# 1. File remaining work
bd create --title="Add pagination to project list" --type=task --priority=2

# 2. Run quality gates
cd backend && ruff check . && pytest tests/unit/
cd ../frontend && npm run lint && npm run test:run

# 3. Close finished issues
bd close beads-001 beads-002 --reason "Completed"

# 4. PUSH - MANDATORY
git pull --rebase
bd sync
git push
git status  # Verify "up to date"

# 5. Clean up
git stash clear
git remote prune origin
```

**Then provide:**
- Summary of what was completed
- What issues were filed for follow-up
- Status of quality gates
- Confirmation that changes are pushed
- Recommended next session prompt

## Agent Session Workflow

**Starting a session:**
```bash
bd ready                     # Find available work
bd show <id>                 # Review issue details
bd update <id> --status in_progress  # Claim it
```

**During work:**
- Keep notes in issue for context that survives compaction:
  ```bash
  bd update <id> --notes "
  COMPLETED: API endpoint for project list
  IN PROGRESS: Adding container management
  BLOCKERS: None
  KEY DECISIONS: Used polling over WebSockets per design doc
  NEXT: Implement Docker exec wrapper
  "
  ```

**Ending a session:**
```bash
bd close <id> --reason "Completed: implemented X, Y, Z"
bd sync                      # Force immediate sync
git status                   # Verify clean state
```

## Common Development Tasks

### Adding a New API Endpoint

1. Add Pydantic schema in `backend/app/schemas/`
2. Add service logic in `backend/app/services/`
3. Add router in `backend/app/routers/`
4. Register router in `backend/app/main.py`
5. Add tests in `backend/tests/`
6. Update API documentation if needed

### Adding a New Frontend Component

1. Create component in `frontend/src/components/`
2. Add types if needed in `frontend/src/types/`
3. Add hooks if needed in `frontend/src/hooks/`
4. Add tests alongside component (`*.test.tsx`)
5. Update parent component to use it

### Adding Container Support

1. Update `docker/Dockerfile` if base image changes
2. Add configuration in `backend/app/services/container.py`
3. Test with actual Docker commands
4. Document any new environment variables

## Decision Trees

### When to Create a Bead vs TodoWrite

**Use Beads (`bd create`) when:**
- Work spans multiple sessions
- Work has dependencies on other work
- Work was discovered during implementation
- Work needs to be tracked across agents
- Work affects project architecture

**Use TodoWrite when:**
- Simple single-session execution steps
- Tracking progress within current task
- Breaking down a bead into sub-steps
- Quick checklist items

### When to Ask vs Proceed

**Ask the user when:**
- Architectural decision not covered in docs
- Multiple valid approaches with trade-offs
- Work deviates from SIMPLIFIED_PLAN.md
- Unsure if feature is in MVP scope

**Proceed without asking when:**
- Following documented patterns
- Implementing what's specified in plan
- Fixing obvious bugs or issues
- Standard code cleanup during implementation

## Building and Testing

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# Backend run
uvicorn app.main:app --reload

# Backend test
pytest

# Frontend setup
cd frontend
npm install

# Frontend run
npm run dev

# Frontend test
npm test
```

## Checking GitHub Issues and PRs

Use `gh` CLI for GitHub operations:

```bash
# List open issues
gh issue list --limit 20

# List open PRs
gh pr list --limit 20

# View specific issue/PR
gh issue view 123
gh pr view 456

# Create PR
gh pr create --title "Title" --body "Description"
```

Provide in-conversation summaries highlighting:
- Urgent/critical issues
- Common themes or patterns
- Items needing immediate attention

## Important Files

- **AGENTS.md** - Entry point, quick reference, policies
- **AGENT_INSTRUCTIONS.md** - This file, detailed operations
- **docs/SIMPLIFIED_PLAN.md** - MVP implementation target
- **docs/TESTING_GUIDE.md** - Complete testing documentation
- **docs/DESIGN_DECISIONS.md** - Architecture rationale
- **docs/TROUBLESHOOTING.md** - Common issues and solutions

## Questions?

- Check existing issues: `bd list`
- Look at recent commits: `git log --oneline -20`
- Read the docs in `docs/`
- Create an issue if unsure: `bd create --title="Question: ..." --type=task --priority=2`
