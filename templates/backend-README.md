# Backend

FastAPI backend for Claude Dev Container. Manages projects, containers, and executions.

## Key Files

- `app/main.py` - FastAPI application entry point
- `app/routers/` - API endpoint definitions
- `app/services/` - Business logic
- `app/schemas/` - Pydantic request/response models

## Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, router registration
│   ├── routers/
│   │   ├── projects.py   # GET /projects
│   │   ├── beads.py      # GET /projects/{id}/beads
│   │   ├── executions.py # POST/GET /executions
│   │   └── containers.py # Container management
│   ├── services/
│   │   ├── project.py    # Project discovery
│   │   ├── beads.py      # Beads CLI wrapper
│   │   ├── container.py  # Docker operations
│   │   └── execution.py  # Execution orchestration
│   └── schemas/
│       ├── project.py    # Project models
│       ├── bead.py       # Bead models
│       └── execution.py  # Execution models
└── tests/
    ├── unit/             # Unit tests
    └── integration/      # API tests
```

## Dependencies

- **Depends on:** Docker, beads CLI (`bd`)
- **Depended by:** Frontend (API client)

## Testing

```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit/

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/unit/test_project.py -v
```

## Development

```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# Run dev server
uvicorn app.main:app --reload

# Lint
ruff check .
ruff format .
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/` | List all projects |
| GET | `/projects/{id}/beads` | List beads for project |
| POST | `/executions/` | Start execution |
| GET | `/executions/{id}` | Get execution status |
| GET | `/containers/{id}/health` | Container health |
