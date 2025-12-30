# Claude Code Project Conventions

## Python Development

**CRITICAL**: Always follow these rules:
- Use `python3` NOT `python` (there is no `python` symlink on this system)
- Use `uv` for virtual environment and package management, NOT `venv` or `pip` directly
- Backend virtual environment: `backend/.venv`

### Setting up backend environment
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt -r requirements-dev.txt
```

### Running backend tests
```bash
cd backend
source .venv/bin/activate
python3 -m pytest
```

### Running backend server
```bash
cd backend
source .venv/bin/activate
python3 -m uvicorn app.main:app --reload
```

## Frontend Development

### Running frontend tests
```bash
cd frontend
npm run test:run
```

### Running frontend dev server
```bash
cd frontend
npm run dev
```

## Beads Workflow
- Use `bd` commands for issue tracking
- Priority scale: 0=critical, 1=high, 2=medium, 3=low, 4=backlog
- Run `bd sync` at end of sessions
