# Backend

FastAPI backend for Claude Dev Container. Manages projects, containers, and executions.

## Key Files

- `app/main.py` - FastAPI application entry point + all routes
- `app/models.py` - Pydantic request/response models
- `app/config.py` - Configuration settings
- `app/services/` - Business logic layer

## Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app + routes
│   ├── models.py         # Pydantic models
│   ├── config.py         # Settings
│   ├── prompts.py        # Prompt templates
│   └── services/
│       ├── beads.py      # Beads CLI wrapper
│       ├── containers.py # Docker operations
│       └── projects.py   # Project discovery
└── tests/
    ├── unit/             # Unit tests
    ├── integration/      # API tests
    └── fixtures/         # Test fixtures (mock_docker.py)
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
pytest tests/integration/test_api_health.py -v
```

## Development

```bash
# Setup
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt -r requirements-dev.txt

# Run dev server
python3 -m uvicorn app.main:app --reload

# Lint
ruff check .
ruff format .
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/projects/` | List all projects |
| GET | `/projects/{id}` | Get project details |
| GET | `/projects/{id}/beads` | List beads for project |
| POST | `/executions/` | Start execution |
| GET | `/executions/{id}` | Get execution status |
| GET | `/executions/{id}/logs` | Get execution logs |
