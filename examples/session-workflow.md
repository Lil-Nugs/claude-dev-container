# Complete Session Workflow

This example shows a complete agent work session from start to finish.

## Session Start

### 1. Orient Yourself

```bash
# What's the current state?
git status
git log --oneline -5

# What work is available?
bd ready

# What's in progress?
bd list --status=in_progress
```

### 2. Choose Work

```bash
# Review available work
bd ready

# Output example:
# beads-012  P2  task    Add container health check endpoint
# beads-015  P2  task    Implement project polling service
# beads-018  P3  feature Add execution history view

# Pick one and review it
bd show beads-012
```

### 3. Claim the Work

```bash
bd update beads-012 --status in_progress
git checkout -b beads-012-health-check
```

## During Work

### 4. Implement

Follow the patterns in `examples/implementing-bead.md`:
- Read relevant docs first
- Follow existing code patterns
- Write tests alongside code
- Run linter frequently

### 5. Keep Notes Updated

If working on something complex or taking breaks:

```bash
bd update beads-012 --notes "
COMPLETED: Health endpoint returns container status
IN PROGRESS: Adding Docker API integration
BLOCKERS: None
KEY DECISIONS: Using docker-py library, polling every 5s
NEXT: Add tests for unhealthy container state
"
```

### 6. Run Quality Checks

```bash
# Backend
cd backend
ruff check .
pytest tests/unit/ -v

# Frontend (if changed)
cd frontend
npm run lint
npm run test:run
```

## Session End

### 7. Complete or Pause Work

**If work is complete:**
```bash
bd close beads-012 --reason "Completed: Health check endpoint with tests"
```

**If pausing for later:**
```bash
bd update beads-012 --notes "
COMPLETED: Core implementation done
IN PROGRESS: Integration tests remaining
BLOCKERS: None
KEY DECISIONS: Using docker-py, 5s polling interval
NEXT: Add integration tests, then close
"
```

### 8. Commit Changes

```bash
git add .
git commit -m "Add container health check endpoint (beads-012)"
```

### 9. Push to Remote (MANDATORY)

```bash
git pull --rebase
bd sync
git push -u origin beads-012-health-check

# VERIFY - this must show "up to date"
git status
```

### 10. Create PR (if ready)

```bash
gh pr create --title "Add container health check" --body "$(cat <<'EOF'
## Summary
- Added GET /containers/{id}/health endpoint
- Returns container status from Docker API
- Polls every 5 seconds for updates

## Test plan
- [x] Unit tests pass
- [x] Integration tests pass
- [ ] Manual test with running container

Closes beads-012

🤖 Generated with Claude Code
EOF
)"
```

### 11. Hand Off

Provide context for the next session:

```
SESSION SUMMARY
===============
Completed: beads-012 (container health check endpoint)
Filed: beads-023 (add retry logic for Docker connection)
Quality gates: All passing
Pushed: Yes, PR #45 created

NEXT SESSION
============
Recommended work: beads-015 (project polling service)
Context: Uses similar Docker API patterns as health check
Start with: Review the polling design in docs/SIMPLIFIED_PLAN.md
```

## Emergency: Session Ending Unexpectedly

If you need to stop quickly:

```bash
# Minimum required steps:
git add .
git commit -m "WIP: describe what you were doing (beads-XXX)"
bd update beads-XXX --notes "WIP: [what's done] [what's next]"
bd sync
git push
```

## Checklist

### Session Start
- [ ] Checked git status
- [ ] Reviewed available work (`bd ready`)
- [ ] Claimed work (`bd update --status in_progress`)
- [ ] Created feature branch

### During Work
- [ ] Read relevant documentation
- [ ] Followed existing patterns
- [ ] Wrote tests
- [ ] Updated notes if complex work

### Session End
- [ ] Quality gates pass (tests, linter)
- [ ] Changes committed with bead ID
- [ ] Bead updated (closed or notes added)
- [ ] `bd sync` run
- [ ] **Pushed to remote** (MANDATORY)
- [ ] `git status` shows "up to date"
- [ ] PR created (if ready)
- [ ] Hand-off context provided
