"""Pydantic models for Claude Dev Container."""

from enum import Enum

from pydantic import BaseModel, Field


class ExecutionState(str, Enum):
    """Execution state for container operations."""

    completed = "completed"
    blocked = "blocked"
    failed = "failed"
    cancelled = "cancelled"


class BeadStatus(str, Enum):
    """Status of a bead/issue."""

    open = "open"
    in_progress = "in_progress"
    closed = "closed"


class BeadType(str, Enum):
    """Type of a bead/issue."""

    task = "task"
    bug = "bug"
    feature = "feature"
    epic = "epic"


class Project(BaseModel):
    """Project model representing a workspace project."""

    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Project name")
    path: str = Field(..., description="Absolute path to project")
    has_beads: bool = Field(
        default=False, description="Whether project has beads initialized"
    )


class Bead(BaseModel):
    """Bead model representing a task/issue."""

    id: str = Field(..., description="Unique bead identifier")
    title: str = Field(..., description="Bead title")
    status: BeadStatus = Field(..., description="Current status")
    description: str | None = Field(default=None, description="Bead description")
    priority: int = Field(
        default=2, description="Priority level (0-4, lower is higher priority)"
    )
    type: BeadType = Field(default=BeadType.task, description="Bead type")


class ExecutionResult(BaseModel):
    """Result of a container execution."""

    output: str = Field(..., description="Command output")
    state: ExecutionState = Field(..., description="Execution state")
    exit_code: int = Field(..., description="Exit code from execution")


class ProgressInfo(BaseModel):
    """Progress information for a running execution."""

    running: bool = Field(..., description="Whether execution is still running")
    output: str = Field(default="", description="Current output")
    recent: str = Field(default="", description="Recent output lines")
    bytes: int = Field(default=0, description="Total bytes of output")


class AttachInfo(BaseModel):
    """Information for attaching to a container."""

    container_id: str = Field(..., description="Docker container ID")
    command: str = Field(..., description="Command to run for attachment")


class WorkRequest(BaseModel):
    """Request body for work endpoint."""

    context: str | None = Field(
        default=None, description="Additional context for the work"
    )


class PushPRRequest(BaseModel):
    """Request body for push-pr endpoint."""

    title: str | None = Field(default=None, description="Optional PR title")


class PushPRResponse(BaseModel):
    """Response from push-pr endpoint."""

    branch: str = Field(..., description="Branch name that was pushed")
    push_output: str = Field(..., description="Output from git push command")
    pr_output: str = Field(..., description="Output from gh pr create command")
    pr_url: str = Field(..., description="URL of the created pull request")


class CommandResult(BaseModel):
    """Result of executing a shell command in a container."""

    exit_code: int = Field(..., description="Command exit code")
    output: str = Field(..., description="Command output")
