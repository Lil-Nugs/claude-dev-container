# Backend Implementation Plan

**Stack**: FastAPI + Docker SDK + GitPython + Beads CLI

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app + CORS + startup
│   ├── config.py                    # Settings (workspace, Docker, timeouts)
│   ├── models.py                    # Pydantic models
│   ├── dependencies.py              # Shared dependencies
│   ├── api/
│   │   ├── __init__.py
│   │   ├── projects.py              # Project endpoints
│   │   ├── beads.py                 # Beads endpoints
│   │   ├── execution.py             # Execution endpoints
│   │   ├── review.py                # Review endpoints
│   │   └── pr.py                    # PR creation endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── project_discovery.py     # Scan ~/projects/
│   │   ├── container_manager.py     # Docker lifecycle
│   │   ├── beads_service.py         # bd CLI wrapper
│   │   ├── claude_executor.py       # Execute Claude in containers
│   │   ├── git_service.py           # Git operations
│   │   ├── review_service.py        # Review workflow
│   │   └── context_builder.py       # NEW: Build execution context
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logging.py               # Structured logging
│   │   └── validators.py            # Input validation
│   └── exceptions.py                # Custom exceptions
├── tests/
│   ├── test_project_discovery.py
│   ├── test_beads_service.py
│   ├── test_execution.py
│   └── test_review.py
├── requirements.txt
└── README.md
```

---

## Core Files

### 1. `app/config.py` - Configuration

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Paths
    workspace_path: str = "~/projects"
    claude_cli_path: str = "/usr/local/bin/claude"
    claude_config_path: str = "~/.claude"

    # Docker
    docker_base_image: str = "claude-dev-base:latest"
    container_cpu_limit: int = 4
    container_memory_limit: str = "8g"
    max_concurrent_containers: int = 3

    # Execution
    default_execution_timeout: int = 21600  # 6 hours
    poll_interval: int = 5  # seconds

    # Git
    github_token: Optional[str] = None
    git_user_name: str = "Claude Dev Container"
    git_user_email: str = "claude@dev-container.local"

    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173", "http://*:5173"]

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2. `app/models.py` - Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Execution models
class ExecutionState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_INPUT = "waiting_input"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class ExecuteRequest(BaseModel):
    context: Optional[str] = None
    instructions: Optional[str] = None
    timeout: Optional[int] = Field(default=1800, ge=60, le=3600)

class ExecutionStatus(BaseModel):
    id: str
    state: ExecutionState
    bead_id: str
    branch_name: Optional[str]
    output: List[str]
    progress_percent: int
    elapsed_seconds: int
    timeout_seconds: int
    error: Optional[str] = None
    questions: List[str] = Field(default_factory=list)

# Project models
class Project(BaseModel):
    id: str
    name: str
    path: str
    has_beads: bool
    container_id: Optional[str] = None
    container_status: Optional[str] = None
    last_commit: Optional[str] = None
    branch: str

# Bead models
class Bead(BaseModel):
    id: str
    title: str
    description: str
    status: str
    priority: int
    type: str
    created_at: datetime
    updated_at: datetime
    assignee: Optional[str] = None
    blocked_by: List[str] = Field(default_factory=list)
    blocks: List[str] = Field(default_factory=list)

# Review models
class ReviewRequest(BaseModel):
    beads: List[str]
    base_branch: str = "main"

class ReviewStatus(BaseModel):
    id: str
    state: str
    beads_reviewed: List[str]
    issues_found: int
    new_beads_created: List[str]
    output: str

# PR models
class PRRequest(BaseModel):
    title: Optional[str] = None
    beads: List[str]
    auto_review: bool = True

class PRResponse(BaseModel):
    pr_url: str
    pr_number: int
    beads_included: List[str]
```

### 3. `app/main.py` - FastAPI App

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.api import projects, beads, execution, review, pr
from app.services.container_manager import ContainerManager

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting Claude Dev Container API")

    # Initialize services
    container_manager = ContainerManager()
    app.state.container_manager = container_manager

    yield

    # Cleanup
    logger.info("Shutting down - cleaning up containers")
    await container_manager.cleanup_all()

app = FastAPI(
    title="Claude Dev Container API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(projects.router, prefix=f"{settings.api_v1_prefix}/projects", tags=["projects"])
app.include_router(beads.router, prefix=f"{settings.api_v1_prefix}/projects", tags=["beads"])
app.include_router(execution.router, prefix=f"{settings.api_v1_prefix}", tags=["execution"])
app.include_router(review.router, prefix=f"{settings.api_v1_prefix}", tags=["review"])
app.include_router(pr.router, prefix=f"{settings.api_v1_prefix}/projects", tags=["pr"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Service Implementations

### 4. `app/services/project_discovery.py`

```python
import os
from pathlib import Path
from typing import List
import subprocess

from app.models import Project
from app.config import settings

class ProjectDiscovery:
    """Discover projects in workspace directory"""

    def __init__(self):
        self.workspace = Path(settings.workspace_path).expanduser()

    async def discover_projects(self) -> List[Project]:
        """Scan workspace for git repositories"""
        projects = []

        for item in self.workspace.iterdir():
            if not item.is_dir():
                continue

            # Check if git repo
            if not (item / ".git").exists():
                continue

            # Check for beads
            has_beads = (item / ".beads").exists()

            # Get current branch
            branch = await self._get_current_branch(item)

            # Get last commit
            last_commit = await self._get_last_commit(item)

            projects.append(Project(
                id=item.name,
                name=item.name,
                path=str(item),
                has_beads=has_beads,
                branch=branch,
                last_commit=last_commit
            ))

        return sorted(projects, key=lambda p: p.name)

    async def _get_current_branch(self, path: Path) -> str:
        """Get current git branch"""
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() or "main"
        except:
            return "main"

    async def _get_last_commit(self, path: Path) -> str:
        """Get last commit message"""
        try:
            result = subprocess.run(
                ["git", "log", "-1", "--pretty=%B"],
                cwd=path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip()[:100]
        except:
            return None
```

### 5. `app/services/beads_service.py`

> **Note**: This implementation assumes beads CLI supports `--format=json` output.
> Verify actual CLI interface with `bd --help` and adjust parsing accordingly.
> The CLI may use different flags (e.g., `--json` or output JSON by default).

```python
import subprocess
import json
import re
from typing import List, Optional
from pathlib import Path

from app.models import Bead
from app.exceptions import BeadsError

class BeadsService:
    """Wrapper for beads CLI"""

    async def list_beads(self, project_path: str, status: Optional[str] = None) -> List[Bead]:
        """List beads for a project"""
        # NOTE: Verify actual bd CLI flags - may differ from assumed --format=json
        cmd = ["bd", "list", "--format=json"]

        if status:
            cmd.extend(["--status", status])

        result = await self._run_bd_command(project_path, cmd)

        # Parse JSON output
        try:
            beads_data = json.loads(result.stdout)
            return [Bead(**bead) for bead in beads_data]
        except json.JSONDecodeError:
            # Fallback: parse text output
            return self._parse_text_output(result.stdout)

    async def get_bead(self, project_path: str, bead_id: str) -> Bead:
        """Get detailed bead information"""
        cmd = ["bd", "show", bead_id, "--format=json"]
        result = await self._run_bd_command(project_path, cmd)

        data = json.loads(result.stdout)
        return Bead(**data)

    async def update_bead(self, project_path: str, bead_id: str, **kwargs) -> None:
        """Update bead fields"""
        cmd = ["bd", "update", bead_id]

        for key, value in kwargs.items():
            cmd.extend([f"--{key}", str(value)])

        await self._run_bd_command(project_path, cmd)

    async def close_bead(self, project_path: str, bead_id: str, reason: Optional[str] = None) -> None:
        """Close a bead"""
        cmd = ["bd", "close", bead_id]

        if reason:
            cmd.extend(["--reason", reason])

        await self._run_bd_command(project_path, cmd)

    async def create_bead(
        self,
        project_path: str,
        title: str,
        description: str,
        type: str = "task",
        priority: int = 2
    ) -> str:
        """Create new bead, return bead ID"""
        cmd = [
            "bd", "create",
            "--title", title,
            "--type", type,
            "--priority", str(priority)
        ]

        if description:
            cmd.extend(["--description", description])

        result = await self._run_bd_command(project_path, cmd)

        # Extract bead ID from output (e.g., "Created beads-xxx")
        match = re.search(r'beads-(\w+)', result.stdout)
        if match:
            return match.group(0)

        raise BeadsError(f"Failed to extract bead ID from: {result.stdout}")

    async def sync_beads(self, project_path: str) -> None:
        """Sync beads with git (bd sync)"""
        cmd = ["bd", "sync"]
        await self._run_bd_command(project_path, cmd)

    async def get_dependencies(self, project_path: str, bead_id: str) -> List[Bead]:
        """Get beads that this bead depends on"""
        bead = await self.get_bead(project_path, bead_id)

        if not bead.blocked_by:
            return []

        # Fetch details for each dependency
        deps = []
        for dep_id in bead.blocked_by:
            dep = await self.get_bead(project_path, dep_id)
            deps.append(dep)

        return deps

    async def _run_bd_command(self, project_path: str, cmd: List[str]) -> subprocess.CompletedProcess:
        """Run bd command in project directory"""
        try:
            result = subprocess.run(
                cmd,
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                raise BeadsError(f"bd command failed: {result.stderr}")

            return result
        except subprocess.TimeoutExpired:
            raise BeadsError("bd command timed out")
        except Exception as e:
            raise BeadsError(f"bd command error: {str(e)}")
```

### 6. `app/services/context_builder.py` ⭐ NEW

```python
from typing import Dict, List, Optional
from pathlib import Path
import subprocess

from app.models import Project, Bead
from app.services.beads_service import BeadsService
from app.services.git_service import GitService

class ContextBuilder:
    """Build comprehensive context for agent execution"""

    def __init__(self, beads_service: BeadsService, git_service: GitService):
        self.beads_service = beads_service
        self.git_service = git_service

    async def build_execution_context(
        self,
        project: Project,
        bead: Bead,
        user_context: Optional[str] = None
    ) -> Dict:
        """Build full context for Claude execution"""

        context = {
            "project": await self._build_project_context(project),
            "bead": await self._build_bead_context(project.path, bead),
            "history": await self._build_history_context(project.path, bead),
            "current_state": await self._build_current_state(project.path),
            "user_context": user_context or "",
        }

        return context

    async def _build_project_context(self, project: Project) -> Dict:
        """Project-level context"""
        readme = await self._read_file(Path(project.path) / "README.md", max_lines=50)

        return {
            "name": project.name,
            "description": readme,
            "tech_stack": await self._detect_tech_stack(project.path),
            "test_command": await self._detect_test_command(project.path),
            "structure": await self._get_project_structure(project.path),
        }

    async def _build_bead_context(self, project_path: str, bead: Bead) -> Dict:
        """Bead-specific context"""
        dependencies = await self.beads_service.get_dependencies(project_path, bead.id)

        return {
            "id": bead.id,
            "title": bead.title,
            "description": bead.description,
            "type": bead.type,
            "priority": bead.priority,
            "created_at": bead.created_at.isoformat(),
            "dependencies": [
                {"id": d.id, "title": d.title, "status": d.status}
                for d in dependencies
            ],
        }

    async def _build_history_context(self, project_path: str, bead: Bead) -> Dict:
        """Historical context"""
        return {
            "recent_commits": await self.git_service.get_recent_commits(project_path, limit=10),
            "previous_attempts": [],  # TODO: Track execution logs
            "related_beads": [],  # TODO: Find beads with similar titles
        }

    async def _build_current_state(self, project_path: str) -> Dict:
        """Current repository state"""
        return {
            "branch": await self.git_service.get_current_branch(project_path),
            "uncommitted_changes": await self.git_service.get_status(project_path),
            "latest_test_results": None,  # TODO: Cache test results
        }

    async def _detect_tech_stack(self, project_path: str) -> List[str]:
        """Detect technologies used"""
        path = Path(project_path)
        stack = []

        if (path / "package.json").exists():
            stack.append("Node.js")
        if (path / "requirements.txt").exists():
            stack.append("Python")
        if (path / "go.mod").exists():
            stack.append("Go")
        if (path / "Cargo.toml").exists():
            stack.append("Rust")

        return stack

    async def _detect_test_command(self, project_path: str) -> Optional[str]:
        """Detect test command"""
        path = Path(project_path)

        # Node.js
        if (path / "package.json").exists():
            return "npm test"

        # Python
        if (path / "pytest.ini").exists() or (path / "tests").exists():
            return "pytest"

        return None

    async def _get_project_structure(self, project_path: str) -> str:
        """Get project structure tree"""
        try:
            result = subprocess.run(
                ["tree", "-L", "2", "-I", "node_modules|.git|__pycache__|*.pyc"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout[:1000]  # Limit size
        except:
            return ""

    async def _read_file(self, file_path: Path, max_lines: int = 100) -> str:
        """Read file with line limit"""
        try:
            with open(file_path) as f:
                lines = [f.readline() for _ in range(max_lines)]
                return "".join(lines)
        except:
            return ""

    def format_prompt(self, context: Dict) -> str:
        """Format context into execution prompt"""
        return f"""
=== SYSTEM INSTRUCTIONS ===
You are executing work in an isolated container for a project.

PROJECT: {context['project']['name']}
Tech Stack: {', '.join(context['project']['tech_stack'])}
Test Command: {context['project']['test_command']}

Project Structure:
{context['project']['structure']}

Description:
{context['project']['description']}

=== YOUR TASK ===
Bead #{context['bead']['id']}: {context['bead']['title']}

Description:
{context['bead']['description']}

Type: {context['bead']['type']}
Priority: P{context['bead']['priority']}

Dependencies:
{self._format_dependencies(context['bead']['dependencies'])}

=== CURRENT STATE ===
Branch: {context['current_state']['branch']}
Uncommitted changes: {len(context['current_state']['uncommitted_changes'])} files

Recent commits:
{self._format_commits(context['history']['recent_commits'])}

=== EXECUTION GUIDELINES ===
1. Work autonomously - no human in the loop
2. Run tests before marking complete: {context['project']['test_command']}
3. Commit changes with message: "Bead {context['bead']['id']}: {context['bead']['title']}"
4. If blocked, output "BLOCKED: [reason]" and exit
5. Output your progress clearly as you work

=== USER CONTEXT ===
{context['user_context']}

=== BEGIN WORK ===
"""

    def _format_dependencies(self, deps: List[Dict]) -> str:
        if not deps:
            return "None"

        return "\n".join([
            f"- {d['id']}: {d['title']} ({d['status']})"
            for d in deps
        ])

    def _format_commits(self, commits: List[Dict]) -> str:
        return "\n".join([
            f"- {c['hash'][:7]}: {c['message']}"
            for c in commits[:5]
        ])
```

---

## Implementation Priority

### Phase 1: Core Infrastructure
1. ✅ `config.py` - Settings
2. ✅ `models.py` - Data models
3. ✅ `main.py` - FastAPI app
4. ✅ `project_discovery.py` - Project scanning
5. ✅ `beads_service.py` - Beads CLI wrapper

### Phase 2: Container Management
6. ✅ `container_manager.py` - (See CONTAINER_PLAN.md)
7. ✅ `git_service.py` - Git operations

### Phase 3: Execution
8. ✅ `context_builder.py` - Context assembly
9. ✅ `claude_executor.py` - Execution logic
10. ✅ `api/execution.py` - Execution endpoints

### Phase 4: Review & PR
11. ✅ `review_service.py` - Review workflow
12. ✅ `api/review.py` - Review endpoints
13. ✅ `api/pr.py` - PR endpoints

---

## Dependencies (`requirements.txt`)

```
# FastAPI
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Docker
docker==7.0.0

# Git
GitPython==3.1.40

# Utilities
python-multipart==0.0.6
httpx==0.25.2
```

---

## Next: See CONTAINER_PLAN.md for container setup
