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
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
npm run dev -- --host
```

## Accessing Dev Servers from Other Machines

Dev servers bind to `0.0.0.0` so they're accessible from other machines on the network.

**Access URLs (replace `<host>` with machine IP or hostname):**
- Frontend: `http://<host>:5173`
- Backend API: `http://<host>:8000`
- Backend docs: `http://<host>:8000/docs`

**Find the machine IP:**
```bash
hostname -I | awk '{print $1}'        # Local network
tailscale ip -4                        # Tailscale (if using)
```

## Viewing Logs During Manual Testing

### Backend logs (FastAPI/uvicorn)
Backend logs appear directly in the terminal where uvicorn is running.
```bash
# Run in foreground to see logs
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or run in background and tail logs
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | tee backend.log &
tail -f backend.log
```

### Docker container logs
```bash
# List running containers
docker ps

# View logs for a container
docker logs <container_id>
docker logs -f <container_id>  # Follow/stream logs

# View logs with timestamps
docker logs -t <container_id>
```

### Frontend dev server logs
Frontend logs appear in the terminal running `npm run dev`. Browser console (F12) shows client-side errors.

## Testing (CRITICAL - Read Before Writing Code)

**TDD Approach**: This project prioritizes test confidence. Write/update tests BEFORE or alongside implementation.

### Quick Reference
```bash
# Backend tests
cd backend && source .venv/bin/activate
python3 -m pytest tests/unit -v          # Unit tests (fast, CI-safe)
python3 -m pytest tests/integration -v   # Integration tests (CI-safe)
python3 -m pytest -m docker -v           # Real Docker tests (LOCAL ONLY)

# Frontend tests
cd frontend
npm run test:run                         # All tests (CI-safe)
npx playwright test                      # E2E tests (CI-safe, mocked backend)
```

### CI vs Local - IMPORTANT
- **CI tests use mocks** - Docker and Claude are mocked in GitHub Actions
- **Local tests can use real Docker** - Mark with `@pytest.mark.docker`
- **Green CI ≠ App Works** - Always run `pytest -m docker` locally before deploy

### Test Writing Rules
1. **New feature?** Write the test first (TDD)
2. **Bug fix?** Write a failing test that reproduces it, then fix
3. **Touching Docker/Container code?** Add both mocked test AND `@pytest.mark.docker` test
4. **Touching API endpoints?** Update integration tests AND frontend mock handlers

### Full Documentation
See `docs/TESTING_STRATEGY.md` for:
- What "app works" means and how we verify it
- CI vs Local testing environments explained
- Test tiers and when to run each
- Examples of CI-safe vs Local-only tests

## Beads Workflow
- Use `bd` commands for issue tracking
- Priority scale: 0=critical, 1=high, 2=medium, 3=low, 4=backlog
- Run `bd sync` at end of sessions
