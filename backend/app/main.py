"""FastAPI application for Claude Dev Container."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    Project,
    Bead,
    ExecutionResult,
    ProgressInfo,
    AttachInfo,
    WorkRequest,
    PushPRRequest,
)

app = FastAPI(
    title="Claude Dev Container",
    description="Backend API for Claude Dev Container PWA",
    version="0.1.0",
)

# CORS for PWA - allow all origins without credentials
# For production, specify exact origins if credentials are needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


# =============================================================================
# Project Endpoints
# =============================================================================


@app.get("/api/projects")
async def list_projects() -> list[Project]:
    """List projects in ~/projects/."""
    # TODO: Implement with ProjectService
    raise HTTPException(status_code=501, detail="Not implemented")


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str) -> Project:
    """Get project details + container status."""
    # TODO: Implement with ProjectService
    raise HTTPException(status_code=501, detail="Not implemented")


# =============================================================================
# Beads Endpoints
# =============================================================================


@app.get("/api/projects/{project_id}/beads")
async def list_beads(project_id: str, status: str | None = None) -> list[Bead]:
    """List beads for a project (calls bd list)."""
    # TODO: Implement with BeadsService
    raise HTTPException(status_code=501, detail="Not implemented")


# =============================================================================
# Action Endpoints
# =============================================================================


@app.post("/api/projects/{project_id}/work/{bead_id}")
async def work_on_bead(
    project_id: str,
    bead_id: str,
    request: WorkRequest | None = None,
) -> ExecutionResult:
    """Run Claude on a bead."""
    # TODO: Implement with ContainerService
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/api/projects/{project_id}/review")
async def review_work(project_id: str) -> ExecutionResult:
    """Run Claude review on current branch."""
    # TODO: Implement with ContainerService
    raise HTTPException(status_code=501, detail="Not implemented")


@app.post("/api/projects/{project_id}/push-pr")
async def push_and_create_pr(
    project_id: str,
    request: PushPRRequest | None = None,
) -> dict[str, str]:
    """Git push + gh pr create."""
    # TODO: Implement with ContainerService
    raise HTTPException(status_code=501, detail="Not implemented")


@app.get("/api/projects/{project_id}/progress")
async def get_progress(project_id: str) -> ProgressInfo:
    """Get current execution progress (for refresh button during long runs)."""
    # TODO: Implement with ContainerService
    raise HTTPException(status_code=501, detail="Not implemented")


@app.get("/api/projects/{project_id}/attach")
async def get_attach_info(project_id: str) -> AttachInfo:
    """Return info needed to attach to container."""
    # TODO: Implement with ContainerService
    raise HTTPException(status_code=501, detail="Not implemented")
