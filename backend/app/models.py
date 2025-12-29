"""Pydantic models for Claude Dev Container."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ExecutionState(str, Enum):
    """Execution state for container operations."""

    completed = "completed"
    blocked = "blocked"
    failed = "failed"
    cancelled = "cancelled"


class Project(BaseModel):
    """Project model representing a workspace project."""

    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Project name")
    path: str = Field(..., description="Absolute path to project")
    has_beads: bool = Field(default=False, description="Whether project has beads initialized")


class Bead(BaseModel):
    """Bead model representing a task/issue."""

    id: str = Field(..., description="Unique bead identifier")
    title: str = Field(..., description="Bead title")
    status: str = Field(..., description="Current status")
    description: Optional[str] = Field(default=None, description="Bead description")
    priority: Optional[str] = Field(default=None, description="Priority level")
    type: Optional[str] = Field(default=None, description="Bead type (feature, bug, etc.)")


class ExecutionResult(BaseModel):
    """Result of a container execution."""

    output: str = Field(..., description="Command output")
    state: ExecutionState = Field(..., description="Execution state")
    exit_code: int = Field(..., description="Exit code from execution")
