"""FastAPI application for Claude Dev Container."""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal

from app.models import (
    Project,
    Bead,
    ExecutionResult,
    ProgressInfo,
    AttachInfo,
    WorkRequest,
    PushPRRequest,
)
from app.services.projects import ProjectService
from app.services.beads import BeadsService
from app.services.containers import ContainerService

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

# Initialize services
project_service = ProjectService()
container_service = ContainerService()


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
    return project_service.list_projects()


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str) -> Project:
    """Get project details + container status."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# =============================================================================
# Beads Endpoints
# =============================================================================


@app.get("/api/projects/{project_id}/beads")
async def list_beads(
    project_id: str,
    status: Literal["open", "in_progress", "blocked", "deferred", "closed"] | None = Query(
        default=None,
        description="Filter beads by status (open, in_progress, blocked, deferred, closed)",
    ),
) -> list[Bead]:
    """List beads for a project (calls bd list)."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.has_beads:
        raise HTTPException(status_code=400, detail="Project does not have beads initialized")

    beads_service = BeadsService(project_path=project.path)
    return beads_service.list_beads(status=status)


# =============================================================================
# Action Endpoints
# =============================================================================


@app.post("/api/projects/{project_id}/work/{bead_id}")
async def work_on_bead(
    project_id: str,
    bead_id: str,
    request: WorkRequest | None = None,
) -> ExecutionResult:
    """Run Claude on a bead.

    Ensures a container is running for the project, then executes Claude CLI
    with the bead context.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify project has beads
    if not project.has_beads:
        raise HTTPException(status_code=400, detail="Project does not have beads initialized")

    # Ensure container is running
    try:
        container_service.ensure_container(project_id, project.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {e}")

    # Build prompt for Claude
    prompt = f"/implement-bead {bead_id}"
    if request and request.context:
        prompt += f"\n\nAdditional context: {request.context}"

    # Execute Claude in container
    try:
        result = container_service.exec_claude(project_id, prompt)
        return result
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")


@app.post("/api/projects/{project_id}/review")
async def review_work(project_id: str) -> ExecutionResult:
    """Run Claude review on current branch.

    Ensures a container is running for the project, then executes Claude CLI
    with the review-implementation skill.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Ensure container is running
    try:
        container_service.ensure_container(project_id, project.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {e}")

    # Execute Claude review in container
    try:
        result = container_service.exec_claude(project_id, "/review-implementation")
        return result
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")


@app.post("/api/projects/{project_id}/push-pr")
async def push_and_create_pr(
    project_id: str,
    request: PushPRRequest | None = None,
) -> dict[str, str]:
    """Git push + gh pr create.

    Pushes the current branch to the remote and creates a pull request.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Ensure container is running
    try:
        container_service.ensure_container(project_id, project.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {e}")

    try:
        # Get current branch name
        branch_output = container_service.exec_command(
            project_id, "git rev-parse --abbrev-ref HEAD"
        )
        branch = branch_output.strip()

        # Push to remote
        push_output = container_service.exec_command(project_id, f"git push -u origin {branch}")

        # Create PR with gh CLI
        pr_title = request.title if request and request.title else ""
        if pr_title:
            pr_cmd = f'gh pr create --title "{pr_title}" --fill'
        else:
            pr_cmd = "gh pr create --fill"

        pr_output = container_service.exec_command(project_id, pr_cmd)

        # Extract PR URL from output (gh pr create outputs the URL)
        pr_url = ""
        for line in pr_output.strip().split("\n"):
            if "github.com" in line and "/pull/" in line:
                pr_url = line.strip()
                break

        return {
            "branch": branch,
            "push_output": push_output,
            "pr_output": pr_output,
            "pr_url": pr_url,
        }
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Push/PR creation failed: {e}")


@app.get("/api/projects/{project_id}/progress")
async def get_progress(project_id: str) -> ProgressInfo:
    """Get current execution progress (for refresh button during long runs).

    Returns the current output buffer and running status for polling
    during long-running operations.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get progress from container service
    return container_service.get_progress(project_id)


@app.get("/api/projects/{project_id}/attach")
async def get_attach_info(project_id: str) -> AttachInfo:
    """Return info needed to attach to container.

    Returns container ID and docker exec command for terminal attachment.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get container ID
    container_id = container_service.get_container_id(project_id)
    if not container_id:
        raise HTTPException(status_code=404, detail="Container not running")

    # Return attach info with truncated container ID for command
    return AttachInfo(
        container_id=container_id,
        command=f"docker exec -it {container_id[:12]} bash",
    )
