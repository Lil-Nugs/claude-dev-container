# Container Implementation Plan

**Stack**: Docker + Python Docker SDK

---

## Overview

Long-running project containers with:
- Isolated workspaces per project
- Shared Claude CLI installation
- Git credentials for pushing
- Resource limits (4 CPU, 8GB RAM)
- Health monitoring

---

## File Structure

```
docker/
├── base/
│   ├── Dockerfile                   # Base image
│   └── .dockerignore
├── scripts/
│   ├── init-project.sh              # Container init
│   ├── git-askpass-helper.sh        # Git credential helper
│   └── healthcheck.sh               # Container health check
└── README.md

backend/app/services/
└── container_manager.py             # Container lifecycle management
```

---

## Base Docker Image

### `docker/base/Dockerfile`

```dockerfile
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install base tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    ca-certificates \
    openssh-client \
    tree \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.11
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install common development tools
RUN npm install -g \
    yarn \
    pnpm \
    typescript \
    eslint \
    prettier

# Install Python common tools
RUN pip3 install --no-cache-dir \
    pytest \
    black \
    flake8 \
    mypy

# Create claude user
RUN useradd -m -s /bin/bash claude \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up git
USER claude
WORKDIR /workspace

# Configure git defaults (will be overridden by mounted .gitconfig)
RUN git config --global init.defaultBranch main \
    && git config --global pull.rebase false

# Health check script
COPY scripts/healthcheck.sh /usr/local/bin/healthcheck
RUN sudo chmod +x /usr/local/bin/healthcheck

# Git credential helper
COPY scripts/git-askpass-helper.sh /usr/local/bin/git-askpass-helper
RUN sudo chmod +x /usr/local/bin/git-askpass-helper

# Default command: keep container running
CMD ["tail", "-f", "/dev/null"]
```

### `docker/scripts/healthcheck.sh`

```bash
#!/bin/bash
# Container health check script

set -e

# Check disk space
DISK_USAGE=$(df -h /workspace | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "ERROR: Disk usage above 90%: ${DISK_USAGE}%"
    exit 1
fi

# Check if workspace is mounted
if [ ! -d "/workspace/.git" ]; then
    echo "ERROR: Workspace not properly mounted"
    exit 1
fi

# Check Claude CLI is available
if [ ! -x "/usr/local/bin/claude" ]; then
    echo "ERROR: Claude CLI not available"
    exit 1
fi

echo "OK: Container healthy"
exit 0
```

### `docker/scripts/git-askpass-helper.sh`

```bash
#!/bin/bash
# Git credential helper for GitHub token authentication

# This script is called by git when credentials are needed
# It reads the GITHUB_TOKEN environment variable

echo "$GITHUB_TOKEN"
```

---

## Container Manager Service

### `backend/app/services/container_manager.py`

```python
import docker
import os
import shutil
from typing import Dict, Optional
from pathlib import Path
import logging

from app.config import settings
from app.models import Project
from app.exceptions import ContainerError

logger = logging.getLogger(__name__)

class ContainerManager:
    """Manage Docker containers for projects"""

    def __init__(self):
        try:
            self.client = docker.from_env()
        except docker.errors.DockerException as e:
            raise ContainerError(f"Failed to connect to Docker: {e}")

        self.containers: Dict[str, docker.models.containers.Container] = {}

    async def ensure_container(self, project: Project) -> docker.models.containers.Container:
        """Ensure project has a running container, create if needed"""

        # Check if container exists and is running
        if project.id in self.containers:
            container = self.containers[project.id]
            container.reload()

            if container.status == "running":
                return container

            # Container stopped, restart it
            logger.info(f"Restarting stopped container for {project.name}")
            container.start()
            return container

        # Create new container
        logger.info(f"Creating new container for {project.name}")
        container = await self._create_container(project)
        self.containers[project.id] = container

        return container

    async def _create_container(self, project: Project) -> docker.models.containers.Container:
        """Create new project container"""

        # Prepare volumes
        volumes = self._prepare_volumes(project)

        # Prepare environment
        environment = self._prepare_environment(project)

        # Resource limits
        resources = {
            "mem_limit": settings.container_memory_limit,
            "cpu_period": 100000,
            "cpu_quota": settings.container_cpu_limit * 100000,
            "pids_limit": 1000,
            "ulimits": [
                docker.types.Ulimit(name="nofile", soft=1024, hard=2048),
            ],
        }

        try:
            container = self.client.containers.create(
                image=settings.docker_base_image,
                name=f"claude-dev-{project.id}",
                volumes=volumes,
                environment=environment,
                working_dir="/workspace",
                user="claude",
                detach=True,
                labels={
                    "project_id": project.id,
                    "project_name": project.name,
                    "managed_by": "claude-dev-container",
                },
                healthcheck={
                    "test": ["CMD", "/usr/local/bin/healthcheck"],
                    "interval": 60_000_000_000,  # 60s in nanoseconds
                    "timeout": 10_000_000_000,   # 10s
                    "retries": 3,
                },
                **resources,
            )

            # Start container
            container.start()

            logger.info(f"Created container {container.id[:12]} for {project.name}")
            return container

        except docker.errors.DockerException as e:
            raise ContainerError(f"Failed to create container: {e}")

    def _prepare_volumes(self, project: Project) -> Dict:
        """Prepare volume mounts for container"""

        # Create per-container Claude config directory
        claude_config_dir = self._get_claude_config_dir(project.id)
        self._init_claude_config(claude_config_dir)

        volumes = {
            # Project workspace (read-write)
            project.path: {
                "bind": "/workspace",
                "mode": "rw",
            },
            # Claude CLI (read-only)
            settings.claude_cli_path: {
                "bind": "/usr/local/bin/claude",
                "mode": "ro",
            },
            # Claude config (read-write, per-container)
            claude_config_dir: {
                "bind": "/home/claude/.claude",
                "mode": "rw",
            },
            # Git config (read-only)
            os.path.expanduser("~/.gitconfig"): {
                "bind": "/home/claude/.gitconfig",
                "mode": "ro",
            },
        }

        # SSH keys for GitHub (read-only)
        ssh_path = os.path.expanduser("~/.ssh")
        if os.path.exists(ssh_path):
            volumes[ssh_path] = {
                "bind": "/home/claude/.ssh",
                "mode": "ro",
            }

        return volumes

    def _prepare_environment(self, project: Project) -> Dict:
        """Prepare environment variables"""

        env = {
            "PROJECT_NAME": project.name,
            "PROJECT_PATH": "/workspace",
        }

        # GitHub token for HTTPS push
        if github_token := settings.github_token:
            env["GITHUB_TOKEN"] = github_token
            env["GIT_ASKPASS"] = "/usr/local/bin/git-askpass-helper"

        return env

    def _get_claude_config_dir(self, project_id: str) -> str:
        """Get per-container Claude config directory"""
        return f"/tmp/claude-config-{project_id}"

    def _init_claude_config(self, config_dir: str):
        """Initialize Claude config directory from host"""
        host_config = os.path.expanduser(settings.claude_config_path)

        if not os.path.exists(config_dir):
            os.makedirs(config_dir, exist_ok=True)

        # Copy host config if exists
        if os.path.exists(host_config):
            # Copy config files (not conversation history)
            for file in ["config.json", "credentials.json"]:
                src = os.path.join(host_config, file)
                dst = os.path.join(config_dir, file)
                if os.path.exists(src) and not os.path.exists(dst):
                    shutil.copy2(src, dst)

    async def execute_command(
        self,
        container: docker.models.containers.Container,
        command: str,
        workdir: str = "/workspace",
        timeout: int = 300,
    ) -> docker.types.ExecResult:
        """Execute command in container"""

        try:
            exec_result = container.exec_run(
                cmd=["bash", "-c", command],
                workdir=workdir,
                user="claude",
                environment=None,
                demux=True,  # Separate stdout/stderr
            )

            return exec_result

        except docker.errors.DockerException as e:
            raise ContainerError(f"Command execution failed: {e}")

    async def stream_command(
        self,
        container: docker.models.containers.Container,
        command: str,
        workdir: str = "/workspace",
    ):
        """Execute command and stream output"""

        exec_instance = self.client.api.exec_create(
            container.id,
            cmd=["bash", "-c", command],
            workdir=workdir,
            user="claude",
            stdout=True,
            stderr=True,
            stdin=False,
        )

        exec_stream = self.client.api.exec_start(
            exec_instance["Id"],
            stream=True,
            demux=True,
        )

        # Stream output
        for stdout, stderr in exec_stream:
            if stdout:
                yield ("stdout", stdout.decode("utf-8"))
            if stderr:
                yield ("stderr", stderr.decode("utf-8"))

    async def get_container_stats(
        self,
        container: docker.models.containers.Container
    ) -> Dict:
        """Get container resource usage stats"""

        container.reload()
        stats = container.stats(stream=False)

        # Calculate metrics
        memory_usage_mb = stats["memory_stats"]["usage"] / 1024 / 1024
        memory_limit_mb = stats["memory_stats"]["limit"] / 1024 / 1024
        memory_percent = (memory_usage_mb / memory_limit_mb) * 100

        # CPU usage (this is simplified)
        cpu_stats = stats.get("cpu_stats", {})
        precpu_stats = stats.get("precpu_stats", {})

        return {
            "status": container.status,
            "age_hours": self._get_container_age_hours(container),
            "memory_usage_mb": round(memory_usage_mb, 2),
            "memory_limit_mb": round(memory_limit_mb, 2),
            "memory_percent": round(memory_percent, 2),
            "disk_usage_percent": await self._get_disk_usage(container),
        }

    async def _get_disk_usage(self, container: docker.models.containers.Container) -> int:
        """Get workspace disk usage percentage"""
        try:
            exec_result = container.exec_run("df -h /workspace | awk 'NR==2 {print $5}'")
            output = exec_result.output.decode("utf-8").strip()
            return int(output.replace("%", ""))
        except:
            return 0

    def _get_container_age_hours(self, container: docker.models.containers.Container) -> float:
        """Get container age in hours"""
        from datetime import datetime, timezone

        created = container.attrs["Created"]
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - created_dt

        return age.total_seconds() / 3600

    async def check_health(
        self,
        container: docker.models.containers.Container
    ) -> tuple[bool, str]:
        """Check if container needs refresh"""

        stats = await self.get_container_stats(container)

        # Check conditions
        if stats["age_hours"] > 72:
            return False, f"Container too old: {stats['age_hours']:.1f} hours"

        if stats["disk_usage_percent"] > 80:
            return False, f"Disk usage too high: {stats['disk_usage_percent']}%"

        if stats["memory_percent"] > 90:
            return False, f"Memory usage too high: {stats['memory_percent']:.1f}%"

        return True, "Healthy"

    async def refresh_container(self, project_id: str) -> docker.models.containers.Container:
        """Recreate container from scratch"""

        logger.info(f"Refreshing container for project {project_id}")

        # Remove old container
        if project_id in self.containers:
            await self.stop_container(project_id)

        # Get project info
        # Note: This assumes you have access to project data
        # You might need to pass project as parameter
        from app.services.project_discovery import ProjectDiscovery
        discovery = ProjectDiscovery()
        projects = await discovery.discover_projects()
        project = next((p for p in projects if p.id == project_id), None)

        if not project:
            raise ContainerError(f"Project {project_id} not found")

        # Create new container
        return await self.ensure_container(project)

    async def stop_container(self, project_id: str):
        """Stop and remove container"""

        if project_id not in self.containers:
            return

        container = self.containers[project_id]

        try:
            logger.info(f"Stopping container for {project_id}")
            container.stop(timeout=10)
            container.remove()

            # Clean up Claude config
            config_dir = self._get_claude_config_dir(project_id)
            if os.path.exists(config_dir):
                shutil.rmtree(config_dir)

            del self.containers[project_id]

        except docker.errors.DockerException as e:
            logger.error(f"Failed to stop container: {e}")
            raise ContainerError(f"Failed to stop container: {e}")

    async def cleanup_all(self):
        """Stop all managed containers (called on shutdown)"""

        logger.info("Cleaning up all containers")

        for project_id in list(self.containers.keys()):
            try:
                await self.stop_container(project_id)
            except Exception as e:
                logger.error(f"Error cleaning up container {project_id}: {e}")

    async def count_active_containers(self) -> int:
        """Count currently running containers"""

        count = 0
        for container in self.containers.values():
            container.reload()
            if container.status == "running":
                count += 1

        return count
```

---

## Build Instructions

### Build base image

```bash
cd docker/base
docker build -t claude-dev-base:latest .
```

### Test container

```bash
# Test creating a container
docker run -it --rm \
  -v ~/projects/test-project:/workspace \
  -v /usr/local/bin/claude:/usr/local/bin/claude:ro \
  -v ~/.claude:/home/claude/.claude:rw \
  -v ~/.gitconfig:/home/claude/.gitconfig:ro \
  -v ~/.ssh:/home/claude/.ssh:ro \
  --user claude \
  claude-dev-base:latest \
  bash

# Inside container, test:
claude --version
git --version
bd --version  # If beads installed in project
```

---

## API Integration

### Container Endpoints

Add to `backend/app/api/projects.py`:

```python
from app.services.container_manager import ContainerManager

@router.post("/{project_id}/ensure-container")
async def ensure_container(
    project_id: str,
    container_manager: ContainerManager = Depends(get_container_manager)
):
    """Ensure project has running container"""
    project = await get_project(project_id)
    container = await container_manager.ensure_container(project)

    return {
        "container_id": container.id[:12],
        "status": container.status,
    }

@router.get("/{project_id}/container/stats")
async def get_container_stats(
    project_id: str,
    container_manager: ContainerManager = Depends(get_container_manager)
):
    """Get container resource usage"""
    if project_id not in container_manager.containers:
        raise HTTPException(status_code=404, detail="Container not running")

    container = container_manager.containers[project_id]
    stats = await container_manager.get_container_stats(container)

    return stats

@router.post("/{project_id}/container/refresh")
async def refresh_container(
    project_id: str,
    container_manager: ContainerManager = Depends(get_container_manager)
):
    """Recreate container from scratch"""
    container = await container_manager.refresh_container(project_id)

    return {
        "container_id": container.id[:12],
        "status": "refreshed",
    }

@router.delete("/{project_id}/container")
async def stop_container(
    project_id: str,
    container_manager: ContainerManager = Depends(get_container_manager)
):
    """Stop and remove container"""
    await container_manager.stop_container(project_id)
    return {"status": "stopped"}
```

---

## Security Considerations

### 1. Volume Mounts
- Project workspace: Read-write (necessary for work)
- Claude CLI: Read-only (prevent modification)
- SSH keys: Read-only (prevent exfiltration)
- Git config: Read-only (prevent tampering)

### 2. Resource Limits
- CPU: 4 cores max
- Memory: 8GB max
- PIDs: 1000 max (prevent fork bombs)
- File descriptors: Limited

### 3. Network Access
- Containers have full network access (needed for package installation)
- Consider adding firewall rules to restrict outbound traffic

### 4. User Permissions
- Container runs as non-root `claude` user
- Has sudo access for package installation
- Review sudo usage in production

---

## Monitoring & Maintenance

### Health Checks
- Built-in Docker health checks every 60s
- Checks disk space, workspace mount, Claude CLI availability
- Automatic container restart on failure (up to 3 retries)

### Auto-Refresh Criteria
Container should be recreated when:
- Age > 72 hours (3 days)
- Disk usage > 80%
- Memory usage > 90%
- Health check fails 3 times

### Manual Refresh
Users can manually refresh containers from the UI:
- Stops current container
- Removes it completely
- Creates fresh container
- Preserves workspace (git repo)

---

## Troubleshooting

### Container won't start
```bash
# Check Docker daemon
docker ps

# Check image exists
docker images | grep claude-dev-base

# Check logs
docker logs <container-id>

# Rebuild image
cd docker/base && docker build --no-cache -t claude-dev-base:latest .
```

### Permission errors in container
```bash
# Check volume mount permissions
ls -la /path/to/project

# Ensure claude user owns workspace
docker exec <container-id> sudo chown -R claude:claude /workspace
```

### Out of disk space
```bash
# Clean up old containers
docker container prune

# Clean up old images
docker image prune

# Check disk usage
docker system df
```

---

## Next: See BACKEND_PLAN.md for container_manager integration
