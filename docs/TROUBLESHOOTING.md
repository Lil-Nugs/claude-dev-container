# Troubleshooting Guide

Common issues and their solutions for agents working on Claude Dev Container.

## Git Issues

### Merge Conflicts in Beads Files

**Symptom:** `git pull` fails with conflicts in `.beads/issues.jsonl`

**Solution:**
```bash
# Accept remote version and re-import
git checkout --theirs .beads/issues.jsonl
bd import -i .beads/issues.jsonl
bd sync
git push
```

**Prevention:** Always run `bd sync` before ending a session.

### Push Rejected (Non-Fast-Forward)

**Symptom:** `git push` fails with "rejected" error

**Solution:**
```bash
git pull --rebase
# Resolve any conflicts
git push
```

**If conflicts during rebase:**
```bash
# Fix the conflicting files, then:
git add <fixed-files>
git rebase --continue
git push
```

### Protected Branch Push Failure

**Symptom:** `git push` to `main` rejected

**Solution:** You cannot push directly to main. Create a feature branch:
```bash
git checkout -b feature/your-work
git push -u origin feature/your-work
# Then create a PR via GitHub
gh pr create --title "Your title" --body "Description"
```

## Docker Issues

### Container Won't Start

**Symptom:** Container exits immediately or fails to start

**Checks:**
```bash
# View container logs
docker logs <container-id>

# Check if image exists
docker images | grep claude-dev

# Rebuild if needed
docker build -t claude-dev-container .
```

**Common causes:**
- Missing environment variables
- Port already in use (try different port)
- Insufficient memory (check resource limits)

### Claude CLI Not Found in Container

**Symptom:** `claude` command not found inside container

**Solution:** Ensure volume mounts are correct and `CLAUDE_CLI_PATH` is set:
```bash
# Set path (default: ~/.local/bin/claude)
export CLAUDE_CLI_PATH="${CLAUDE_CLI_PATH:-$HOME/.local/bin/claude}"

docker run -v "$CLAUDE_CLI_PATH":/usr/local/bin/claude \
           -v ~/.claude:/root/.claude \
           claude-dev-container
```

### Container Out of Memory

**Symptom:** Container killed, OOMKilled in status

**Solution:**
```bash
# Increase memory limit
docker run --memory=8g claude-dev-container

# Check current usage
docker stats <container-id>
```

## Backend Issues

### FastAPI Won't Start

**Symptom:** `uvicorn app.main:app` fails

**Checks:**
```bash
# Ensure virtual environment is active
source venv/bin/activate

# Check dependencies installed
pip install -e ".[dev]"

# Check for port conflicts
lsof -i :8000
```

### Import Errors

**Symptom:** `ModuleNotFoundError` when running

**Solution:**
```bash
# Install in editable mode
cd backend
pip install -e ".[dev]"

# Verify installation
pip list | grep claude-dev
```

### Tests Failing

**Symptom:** `pytest` failures

**Steps:**
1. Read the error message carefully
2. Run specific failing test with verbose output:
   ```bash
   pytest tests/unit/test_specific.py -v
   ```
3. Check if it's a missing dependency or actual bug
4. If tests were passing before your changes, your code likely broke something

## Frontend Issues

### npm install Fails

**Symptom:** Dependency installation errors

**Solution:**
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### TypeScript Errors

**Symptom:** Type errors during build or test

**Checks:**
```bash
# Run type checker
npm run typecheck

# Fix types before running tests
```

### Tests Timing Out

**Symptom:** Vitest tests hang or timeout

**Solution:**
```bash
# Run with increased timeout
npm test -- --testTimeout=10000

# Run specific test file
npm test -- src/components/MyComponent.test.tsx
```

## Beads Issues

### bd Commands Not Working

**Symptom:** `bd` command not found or errors

**Solution:**
```bash
# Check if beads is installed
which bd

# Run doctor to diagnose
bd doctor

# Fix common issues
bd doctor --fix
```

### Issues Not Syncing

**Symptom:** Changes not appearing after `bd sync`

**Checks:**
```bash
# Check sync status
bd sync --status

# Force export
bd export

# Check git status
git status
```

### Database Locked

**Symptom:** "database is locked" error

**Solution:**
```bash
# Check for other bd processes
ps aux | grep bd

# Kill stuck daemon
bd daemon stop

# Retry operation
bd sync
```

## Session Recovery

### Resuming After Crash

If your session ended unexpectedly:

1. **Check what was pushed:**
   ```bash
   git log --oneline -5
   git status
   ```

2. **Check beads state:**
   ```bash
   bd list --status=in_progress
   bd show <your-issue>
   ```

3. **Recover unpushed work:**
   ```bash
   git stash list          # Check for stashed changes
   git stash pop           # Recover if needed
   ```

4. **Resume work:**
   ```bash
   bd update <id> --status in_progress
   # Continue where you left off
   ```

### Lost Context After Compaction

If conversation context was compacted:

1. **Read your issue notes:**
   ```bash
   bd show <issue-id>
   ```

   Well-written notes include:
   - COMPLETED: What's done
   - IN PROGRESS: Current state
   - BLOCKERS: What's stuck
   - KEY DECISIONS: Context you need
   - NEXT: What to do next

2. **Check recent commits:**
   ```bash
   git log --oneline -10
   git diff HEAD~3..HEAD
   ```

3. **Read relevant docs:**
   - `docs/SIMPLIFIED_PLAN.md` for implementation details
   - `docs/DESIGN_DECISIONS.md` for architecture context

## When to Ask for Help

Create an issue if:
- Error persists after trying documented solutions
- You need to make an architectural decision not covered in docs
- You discover a bug in the infrastructure
- You're blocked for more than 15 minutes

```bash
bd create --title="Blocked: describe the issue" --type=bug --priority=1
```

Include in the issue:
- What you were trying to do
- The error message
- What you already tried
- Relevant file paths or code snippets
