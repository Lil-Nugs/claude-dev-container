# Adding a New API Endpoint

Step-by-step guide for adding a backend endpoint.

## File Structure

```
backend/
├── app/
│   ├── main.py              # Register router here
│   ├── schemas/
│   │   └── your_schema.py   # Pydantic models
│   ├── services/
│   │   └── your_service.py  # Business logic
│   └── routers/
│       └── your_router.py   # API endpoints
└── tests/
    ├── unit/
    │   └── test_your_service.py
    └── integration/
        └── test_your_router.py
```

## Step 1: Define Schema

`backend/app/schemas/execution.py`:
```python
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class ExecutionCreate(BaseModel):
    """Request to start an execution."""
    project_id: str
    bead_id: str
    context: str | None = None

class ExecutionOut(BaseModel):
    """Execution response."""
    id: str
    project_id: str
    bead_id: str
    status: ExecutionStatus
    started_at: datetime
    completed_at: datetime | None = None
    output: str | None = None
```

## Step 2: Implement Service

`backend/app/services/execution.py`:
```python
import uuid
from datetime import datetime
from app.schemas.execution import ExecutionCreate, ExecutionOut, ExecutionStatus

# In-memory store (replace with proper storage later)
_executions: dict[str, ExecutionOut] = {}

def start_execution(request: ExecutionCreate) -> ExecutionOut:
    """Start a new execution."""
    execution = ExecutionOut(
        id=str(uuid.uuid4()),
        project_id=request.project_id,
        bead_id=request.bead_id,
        status=ExecutionStatus.PENDING,
        started_at=datetime.utcnow(),
    )
    _executions[execution.id] = execution
    # TODO: Actually start the container execution
    return execution

def get_execution(execution_id: str) -> ExecutionOut | None:
    """Get execution by ID."""
    return _executions.get(execution_id)

def list_executions(project_id: str | None = None) -> list[ExecutionOut]:
    """List executions, optionally filtered by project."""
    executions = list(_executions.values())
    if project_id:
        executions = [e for e in executions if e.project_id == project_id]
    return executions
```

## Step 3: Create Router

`backend/app/routers/executions.py`:
```python
from fastapi import APIRouter, HTTPException
from app.schemas.execution import ExecutionCreate, ExecutionOut
from app.services import execution as execution_service

router = APIRouter(prefix="/executions", tags=["executions"])

@router.post("/", response_model=ExecutionOut, status_code=201)
def create_execution(request: ExecutionCreate):
    """Start a new execution."""
    return execution_service.start_execution(request)

@router.get("/{execution_id}", response_model=ExecutionOut)
def get_execution(execution_id: str):
    """Get execution status."""
    execution = execution_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution

@router.get("/", response_model=list[ExecutionOut])
def list_executions(project_id: str | None = None):
    """List executions."""
    return execution_service.list_executions(project_id)
```

## Step 4: Register Router

`backend/app/main.py`:
```python
from fastapi import FastAPI
from app.routers import executions  # Add import

app = FastAPI(title="Claude Dev Container")

app.include_router(executions.router)  # Add router
```

## Step 5: Write Unit Tests

`backend/tests/unit/test_execution_service.py`:
```python
import pytest
from app.services.execution import start_execution, get_execution, list_executions
from app.schemas.execution import ExecutionCreate, ExecutionStatus

@pytest.fixture(autouse=True)
def clear_executions():
    """Clear executions between tests."""
    from app.services import execution
    execution._executions.clear()

def test_start_execution_creates_pending():
    """Starting execution should create pending status."""
    request = ExecutionCreate(
        project_id="proj-1",
        bead_id="beads-001",
    )
    result = start_execution(request)

    assert result.status == ExecutionStatus.PENDING
    assert result.project_id == "proj-1"
    assert result.bead_id == "beads-001"
    assert result.id is not None

def test_get_execution_returns_created():
    """Should retrieve execution by ID."""
    request = ExecutionCreate(project_id="proj-1", bead_id="beads-001")
    created = start_execution(request)

    result = get_execution(created.id)

    assert result is not None
    assert result.id == created.id

def test_get_execution_returns_none_for_unknown():
    """Should return None for unknown ID."""
    result = get_execution("unknown-id")
    assert result is None

def test_list_executions_filters_by_project():
    """Should filter by project_id."""
    start_execution(ExecutionCreate(project_id="proj-1", bead_id="b1"))
    start_execution(ExecutionCreate(project_id="proj-2", bead_id="b2"))

    result = list_executions(project_id="proj-1")

    assert len(result) == 1
    assert result[0].project_id == "proj-1"
```

## Step 6: Write Integration Tests

`backend/tests/integration/test_executions_api.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_execution():
    """POST /executions should create execution."""
    response = client.post("/executions/", json={
        "project_id": "proj-1",
        "bead_id": "beads-001",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert "id" in data

def test_get_execution_not_found():
    """GET /executions/{id} should 404 for unknown."""
    response = client.get("/executions/unknown-id")
    assert response.status_code == 404

def test_list_executions():
    """GET /executions should return list."""
    response = client.get("/executions/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

## Step 7: Run Tests

```bash
cd backend

# Run your new tests
pytest tests/unit/test_execution_service.py -v
pytest tests/integration/test_executions_api.py -v

# Run all tests to check for regressions
pytest

# Check linting
ruff check .
```

## Checklist

- [ ] Schema defined with Pydantic models
- [ ] Service implements business logic
- [ ] Router defines endpoints
- [ ] Router registered in main.py
- [ ] Unit tests for service functions
- [ ] Integration tests for API endpoints
- [ ] All tests passing
- [ ] Linter passing
