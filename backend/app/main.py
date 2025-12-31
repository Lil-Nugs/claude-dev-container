"""FastAPI application for Claude Dev Container."""

import shlex
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.models import (
    AttachInfo,
    Bead,
    ExecutionResult,
    ProgressInfo,
    Project,
    PushPRRequest,
    PushPRResponse,
    WorkRequest,
)
from app.services.beads import BeadsService
from app.services.containers import ContainerService
from app.services.projects import ProjectService

# Initialize rate limiter with in-memory storage (default)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Claude Dev Container",
    description="Backend API for Claude Dev Container PWA",
    version="0.1.0",
)

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit("60/minute")
async def list_projects(request: Request) -> list[Project]:
    """List projects in ~/projects/."""
    return project_service.list_projects()


@app.get("/api/projects/{project_id}")
@limiter.limit("60/minute")
async def get_project(request: Request, project_id: str) -> Project:
    """Get project details + container status."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# =============================================================================
# Beads Endpoints
# =============================================================================


@app.get("/api/projects/{project_id}/beads")
@limiter.limit("60/minute")
async def list_beads(
    request: Request,
    project_id: str,
    status: (
        Literal["open", "in_progress", "blocked", "deferred", "closed"] | None
    ) = Query(
        default=None,
        description="Filter by status",
    ),
) -> list[Bead]:
    """List beads for a project (calls bd list)."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.has_beads:
        raise HTTPException(
            status_code=400, detail="Project does not have beads initialized"
        )

    beads_service = BeadsService(project_path=project.path)
    return beads_service.list_beads(status=status)


# =============================================================================
# Action Endpoints
# =============================================================================


@app.post("/api/projects/{project_id}/work/{bead_id}")
@limiter.limit("10/minute")
async def work_on_bead(
    request: Request,
    project_id: str,
    bead_id: str,
    body: WorkRequest | None = None,
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
        raise HTTPException(
            status_code=400, detail="Project does not have beads initialized"
        )

    # Ensure container is running
    try:
        container_service.ensure_container(project_id, project.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {e}")

    # Build prompt for Claude
    # Use direct prompt instead of skill (skills may not be available in container)
    prompt = (
        f"Work on the bead/issue with ID: {bead_id}\n\n"
        f"Run 'bd show {bead_id}' to see the issue details, then implement "
        "the required changes. Follow the project's coding conventions and "
        "run tests if applicable."
    )
    if body and body.context:
        prompt += f"\n\nAdditional context from user: {body.context}"

    # Execute Claude in container
    try:
        result = container_service.exec_claude(project_id, prompt)
        return result
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")


@app.post("/api/projects/{project_id}/review")
@limiter.limit("10/minute")
async def review_work(request: Request, project_id: str) -> ExecutionResult:
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
    # Use direct prompt instead of skill (skills may not be available in container)
    review_prompt = (
        "Review the recent implementation changes in this project. "
        "Run 'git diff' to see changes, check for bugs, security issues, "
        "and code quality. Summarize your findings."
    )
    try:
        result = container_service.exec_claude(project_id, review_prompt)
        return result
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")


@app.post("/api/projects/{project_id}/push-pr")
@limiter.limit("10/minute")
async def push_and_create_pr(
    request: Request,
    project_id: str,
    body: PushPRRequest | None = None,
) -> PushPRResponse:
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
        branch_result = container_service.exec_command(
            project_id, "git rev-parse --abbrev-ref HEAD"
        )
        if branch_result.exit_code != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get branch name: {branch_result.output}",
            )
        branch = branch_result.output.strip()

        # Push to remote
        safe_branch = shlex.quote(branch)
        push_cmd = f"git push -u origin {safe_branch}"
        push_result = container_service.exec_command(project_id, push_cmd)
        if push_result.exit_code != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Git push failed: {push_result.output}",
            )

        # Create PR with gh CLI
        pr_title = body.title if body and body.title else ""
        if pr_title:
            safe_title = shlex.quote(pr_title)
            pr_cmd = f"gh pr create --title {safe_title} --fill"
        else:
            pr_cmd = "gh pr create --fill"

        pr_result = container_service.exec_command(project_id, pr_cmd)
        if pr_result.exit_code != 0:
            raise HTTPException(
                status_code=500,
                detail=f"PR creation failed: {pr_result.output}",
            )

        # Extract PR URL from output (gh pr create outputs the URL)
        pr_url = ""
        for line in pr_result.output.strip().split("\n"):
            if "github.com" in line and "/pull/" in line:
                pr_url = line.strip()
                break

        return PushPRResponse(
            branch=branch,
            push_output=push_result.output,
            pr_output=pr_result.output,
            pr_url=pr_url,
        )
    except KeyError:
        raise HTTPException(status_code=500, detail="Container not available")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Push/PR creation failed: {e}")


@app.get("/api/projects/{project_id}/progress")
@limiter.limit("120/minute")
async def get_progress(request: Request, project_id: str) -> ProgressInfo:
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
@limiter.limit("60/minute")
async def get_attach_info(request: Request, project_id: str) -> AttachInfo:
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
