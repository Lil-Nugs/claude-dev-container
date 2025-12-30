# Overnight Testing Session

You are a LIGHTWEIGHT ORCHESTRATOR working overnight to get all test-related beads fixed. Your job is to coordinate work, NOT do implementation yourself.

## CRITICAL: Context Management

**You must stay lightweight to run for 8 hours.** Follow these rules:

1. **NEVER read code files directly** - delegate to sub-agents
2. **NEVER implement fixes yourself** - spawn fresh sub-agents for ALL implementation
3. **Each Task() spawns a FRESH agent** with no prior context - include ALL needed info in the prompt
4. **Your job**: coordinate, track progress, commit, manage beads
5. **Sub-agent job**: read code, implement fixes, run tests

This keeps YOUR context small while sub-agents do the heavy lifting.

## Session Goals

1. Fix all testing-related beads (labeled `testing`)
2. Ensure all tests pass after each fix
3. Run for up to 8 hours or until all testing beads are complete

## Test Commands (for sub-agent prompts)

- Backend: `cd backend && source .venv/bin/activate && python3 -m pytest tests/ -v`
- Frontend: `source ~/.nvm/nvm.sh && cd frontend && npm run test:run`
- E2E tests may fail due to missing Playwright deps (bead `0hi` addresses this)

## GUARDRAILS

| Guardrail | Threshold | Action |
|-----------|-----------|--------|
| Same bead fails | 5x | Skip that bead, note in PR |
| Total test failures | 10 | Pause and assess |
| Same test keeps failing | 5x | Create a fix bead, continue |
| Files changed | 75 | Create PR, start new branch |

## SETUP

```bash
# Start fresh
git checkout main && git pull
git checkout -b overnight-testing-$(date +%Y%m%d-%H%M)

# Verify initial test state
cd backend && source .venv/bin/activate && python3 -m pytest tests/unit -q
source ~/.nvm/nvm.sh && cd frontend && npm run test:run -- --reporter=dot
cd ..
```

## MAIN LOOP

### Step 1: Find Testing Work

```bash
bd ready --label=testing --limit=10
```

If no testing beads ready, check blocked:
```bash
bd blocked | grep testing
```

If blocked testing beads exist, their blockers may be testing-related too.

### Step 2: Select and Implement

Select ONE testing bead. Prioritize:
1. Blockers of other testing beads (unblock more work)
2. P1/P2 bugs (quality issues)
3. CI-related fixes (helps verification)
4. P3 improvements

Mark in progress:
```bash
bd update <bead-id> --status=in_progress
```

Spawn a FRESH implementation sub-agent (include ALL context - agent has no prior knowledge):
```
Task(subagent_type='general-purpose', prompt='You are implementing a testing-related bead for claude-dev-container.

## Your Task
Implement bead: <bead-id>

## Step 1: Understand the task
Run: `bd show <bead-id>`

## Step 2: Read CLAUDE.md for project conventions
Run: `cat CLAUDE.md`

Key rules:
- Use `python3` not `python`
- Use `uv` for Python packages
- Backend venv: `backend/.venv`

## Step 3: Read relevant context
Read `docs/TESTING_STRATEGY.md` for testing patterns.
Read any files mentioned in the bead description.

## Step 4: Implement the fix
- Read existing code before modifying
- Follow existing patterns
- Make minimal changes

## Step 5: Verify tests pass
Backend: `cd backend && source .venv/bin/activate && python3 -m pytest tests/ -v`
Frontend: `source ~/.nvm/nvm.sh && cd frontend && npm run test:run`

## Step 6: Report results
Do NOT commit. Report:
- SUCCESS: what you changed, test output summary
- FAILURE: what went wrong, error messages

Be thorough but concise.')
```

### Step 3: Verify ALL Tests Pass

After implementation, run full test suite:

```bash
# Backend tests
cd /home/mattc/projects/claude-dev-container/backend
source .venv/bin/activate
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -30

# Frontend tests
source ~/.nvm/nvm.sh
cd /home/mattc/projects/claude-dev-container/frontend
npm run test:run 2>&1 | tail -30
```

If tests fail:
1. Increment failure counter for this bead
2. If < 5 failures: Try to fix, go back to Step 2
3. If >= 5 failures: Reset bead status, skip it, note the failure

### Step 4: Commit and Close

If tests pass:

```bash
git add -A
git status

# Commit with bead reference
git commit -m "$(cat <<'EOF'
Fix <bead-id>: <short description>

- <what was done>
- Tests verified passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

bd close <bead-id>
bd sync
```

### Step 5: Continue Loop

```bash
bd ready --label=testing
```

If more testing beads exist, go to Step 2.
If no more testing beads, go to FINALIZE.

## FINALIZE

### Create Summary

```bash
# Count achievements
echo "=== TESTING SESSION SUMMARY ==="
bd list --label=testing --status=closed | wc -l
echo "beads closed"

bd list --label=testing --status=open
echo "beads remaining"
```

### Create PR

```bash
if ! git diff main --quiet; then
    git push -u origin $(git branch --show-current)

    gh pr create --title "Testing fixes: $(date +%Y-%m-%d)" --body "$(cat <<'EOF'
## Summary

Overnight testing session to fix all test-related beads.

## Testing Beads Fixed

$(bd list --label=testing --status=closed | head -20)

## Testing Beads Remaining

$(bd list --label=testing --status=open)

## Test Results

Backend: [X passed, Y skipped]
Frontend: [X passed]

## Stop Reason

[Why session ended - all done, or what blocker hit]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
fi
```

### Cleanup

```bash
bd sync
git checkout main
git pull
```

## CURRENT TESTING BEADS

As of session creation, these are the testing beads:

| ID | Priority | Title | Status |
|----|----------|-------|--------|
| eev | P1 | Add frontend-to-backend integration test | Ready |
| 0hi | P2 | Install Playwright browser system dependencies | Ready |
| 1e1 | P2 | Fix ruff lint errors | Ready |
| xnr | P3 | Add data-testid to BeadList loading spinner | Ready |
| 0mp | P3 | Update E2E bead-listing test to use data-testid | Blocked by xnr |
| 5bs | P3 | Increase Playwright CI workers | Ready |
| 9bs | P3 | Add Docker image build step to CI | Ready |

**Recommended order:**
1. `xnr` (unblocks 0mp)
2. `0mp` (now unblocked)
3. `1e1` (code quality)
4. `5bs` (quick CI improvement)
5. `9bs` (CI Docker)
6. `0hi` (Playwright deps)
7. `eev` (integration test)

---

## PHASE 2: BONUS BATCH RUN

After testing PR is created and merged (or if no testing work remains), do 3 loops of general batch work on a NEW branch.

**Why a new branch?** Testing fixes are isolated in their PR. General work goes in a separate PR so testing improvements can be reviewed/merged independently.

### Phase 2 Setup

```bash
# Ensure on main with testing PR submitted
git checkout main
git pull

# Create new branch for general work
git checkout -b overnight-batch-$(date +%Y%m%d-%H%M)
```

### Phase 2 Loop (3 iterations max)

For each iteration (up to 3):

#### 2.1 Find Non-Testing Work

```bash
bd ready --limit=10
```

Skip any beads with `testing` label. Select highest priority non-testing bead.

#### 2.2 Implement

Mark in progress:
```bash
bd update <bead-id> --status=in_progress
```

Spawn a FRESH implementation sub-agent:
```
Task(subagent_type='general-purpose', prompt='You are implementing a bead for claude-dev-container.

## Your Task
Implement bead: <bead-id>

## Step 1: Understand the task
Run: `bd show <bead-id>`

## Step 2: Read CLAUDE.md for project conventions
Run: `cat CLAUDE.md`

Key rules:
- Use `python3` not `python`
- Use `uv` for Python packages
- Backend venv: `backend/.venv`

## Step 3: Read relevant files
Read any files mentioned in the bead description.
Read existing code before modifying.

## Step 4: Implement
- Follow existing patterns
- Write tests for new functionality
- Make minimal changes

## Step 5: Verify tests pass
Backend: `cd backend && source .venv/bin/activate && python3 -m pytest tests/ -v`
Frontend: `source ~/.nvm/nvm.sh && cd frontend && npm run test:run`

## Step 6: Report results
Do NOT commit. Report SUCCESS or FAILURE with details.')
```

#### 2.3 Verify and Commit

Run tests. If pass:
```bash
git add -A
git commit -m "$(cat <<'EOF'
Implement <bead-id>: <short description>

- <what was done>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

bd close <bead-id>
bd sync
```

If fail after 2 attempts, skip and continue.

#### 2.4 Quick Review

Spawn a FRESH review sub-agent:
```
Task(subagent_type='general-purpose', prompt='You are reviewing recent code changes in claude-dev-container.

## Your Task
Review the most recent commit for issues.

## Step 1: See what changed
Run: `git log -1 --stat`
Run: `git diff HEAD~1`

## Step 2: Check for issues
Look for:
- Bugs or logic errors
- Missing error handling
- Security issues
- Test gaps

## Step 3: Create fix beads if needed
For any issues found, run:
`bd create --title="Fix: <issue>" --type=bug --priority=1`

## Step 4: Report
List any issues found and beads created.
Do NOT create a PR.')
```

Handle any P0/P1 fix beads before next iteration.

### Phase 2 Finalize

After 3 loops (or no more ready work):

```bash
if ! git diff main --quiet; then
    git push -u origin $(git branch --show-current)

    gh pr create --title "Batch work: $(date +%Y-%m-%d)" --body "$(cat <<'EOF'
## Summary

Bonus batch run after testing session.

## Beads Implemented

$(git log main..HEAD --oneline)

## Test Results

All tests passing.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
fi

bd sync
git checkout main
```

---

## BEGIN

### Phase 1: Testing Focus
1. Run SETUP
2. Enter MAIN LOOP (testing beads only)
3. When all testing beads done or stuck, run FINALIZE
4. Create testing PR

### Phase 2: Bonus Work
5. If time remains and testing PR created, run PHASE 2
6. Do up to 3 implementation loops on non-testing beads
7. Create separate batch PR
