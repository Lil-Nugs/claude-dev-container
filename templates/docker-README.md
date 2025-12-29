# Docker

Container configuration for Claude Dev Container. Provides isolated execution environments.

## Key Files

- `Dockerfile` - Container image definition
- `docker-compose.yml` - Development environment setup
- `entrypoint.sh` - Container startup script

## Structure

```
docker/
├── Dockerfile            # Main container image
├── docker-compose.yml    # Dev environment
├── entrypoint.sh         # Startup script
└── scripts/
    └── healthcheck.sh    # Health check script
```

## Configuration

### Claude CLI Path

The Claude CLI location varies by installation method. Set `CLAUDE_CLI_PATH` to match your system:

```bash
# Default (npm/local install)
export CLAUDE_CLI_PATH="${CLAUDE_CLI_PATH:-$HOME/.local/bin/claude}"

# Alternative (global install)
# export CLAUDE_CLI_PATH="/usr/local/bin/claude"
```

## Container Design

### Base Image
Ubuntu 22.04 with:
- Python 3.11+
- Node.js 20+
- Git
- Common build tools

### Volume Mounts
| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `~/projects/<name>` | `/workspace` | Project files |
| `$CLAUDE_CLI_PATH` | `/usr/local/bin/claude` | Claude CLI |
| `~/.claude` | `/root/.claude` | Claude config |

### Resource Limits
- CPU: 4 cores
- Memory: 8GB
- Disk: Project size + 2GB working space

## Dependencies

- **Depends on:** Docker daemon, Claude CLI on host
- **Depended by:** Backend (container management service)

## Testing

```bash
# Build image
docker build -t claude-dev-container .

# Run container
docker run -it --rm \
  -v ~/projects/my-project:/workspace \
  -v "$CLAUDE_CLI_PATH":/usr/local/bin/claude \
  -v ~/.claude:/root/.claude \
  claude-dev-container

# Test health check
docker exec <container-id> /scripts/healthcheck.sh
```

## Development

```bash
# Build with no cache
docker build --no-cache -t claude-dev-container .

# Run with shell access
docker run -it --rm claude-dev-container /bin/bash

# View logs
docker logs -f <container-id>

# Check resource usage
docker stats <container-id>
```

## Container Lifecycle

1. **Create:** Backend creates container when project selected
2. **Start:** Container kept warm for fast startup
3. **Execute:** Claude runs in container via exec
4. **Monitor:** Health checks every 5 seconds
5. **Cleanup:** Manual delete or auto-cleanup (configurable)

## Troubleshooting

### Container won't start
```bash
docker logs <container-id>
docker inspect <container-id>
```

### Claude CLI not found
Verify host mounts:
```bash
ls -la "$CLAUDE_CLI_PATH"
ls -la ~/.claude
```

### Out of memory
Increase limit or reduce concurrent containers:
```bash
docker run --memory=12g claude-dev-container
```
