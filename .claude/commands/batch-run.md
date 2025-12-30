---
description: Run batch implementation with configurable loops, guardrails, and PR review
allowed-tools: Bash(*), Read(*), Write(*), Edit(*), Glob(*), Grep(*), Task(*), TodoWrite(*)
---

# Batch Run Orchestrator

You are a BATCH ORCHESTRATOR. Your job is to implement ready beads on a single branch, committing after each successful bead, then create a PR with automated review.

## Arguments

Parse these from the command invocation:

| Argument | Description | Default |
|----------|-------------|---------|
| `--loops=N` | Max implement/review cycles | unlimited |
| `--max-time=Xh` | Time limit (e.g., `4h`, `2h`) | 8h |
| `--max-beads=N` | Stop after closing N beads | unlimited |
| `short` | Preset: 3 loops, 1h max | - |
| `medium` | Preset: 10 loops, 4h max | - |
| `overnight` | Preset: no loop limit, 8h max | - |

**Examples:**
- `/batch-run --loops=5` - Run up to 5 cycles
- `/batch-run --loops=10 --max-time=2h` - 10 cycles or 2 hours, whichever first
- `/batch-run overnight` - Full overnight run
- `/batch-run short` - Quick 3-cycle run

## Static Guardrails (Always Enforced)

Track these counters throughout the session:

| Guardrail | Threshold | Action |
|-----------|-----------|--------|
| Same bead fails | 2x | Skip that bead, continue |
| Total failures | 5 | Stop session |
| Same test issue fails | 3x | Stop session |
| Files changed | 50 | Stop session |
| Forbidden paths touched | Any | Skip that bead |

**Forbidden Paths** (beads touching these require human review):
- `*.env*`, `**/secrets/**`

## Session State

Track this state throughout:
```
start_time: <timestamp>
loops_completed: 0
beads_closed: 0
total_failures: 0
bead_failures: {}  # bead_id -> failure_count
files_changed: []
skipped_beads: []
```

---

## PHASE 1: SETUP

```bash
# Record start time
echo "Batch run started at $(date)"

# Ensure clean state
git checkout main
git pull

# Create batch branch
git checkout -b batch-$(date +%Y%m%d-%H%M)
```

---

## PHASE 2: MAIN LOOP

Repeat until a stop condition is met:

### Step 2.1: Check Stop Conditions

Before each iteration, verify:
1. `loops_completed < max_loops` (if set)
2. `elapsed_time < max_time`
3. `beads_closed < max_beads` (if set)
4. `total_failures < 5`
5. `bd ready` has work available

If any condition fails, go to PHASE 3: FINALIZE.

### Step 2.2: Get Ready Work

```bash
bd ready
```

If no ready beads, go to PHASE 3.

Select ONE bead to implement. Prefer:
1. P0/P1 fix beads (from previous review)
2. Tasks that unblock other work
3. Highest priority ready bead

Check if the bead touches forbidden paths:
```bash
bd show <bead-id>
```

If it likely touches forbidden paths, add to `skipped_beads` and select another.

### Step 2.3: Implement

Mark in progress:
```bash
bd update <bead-id> --status=in_progress
```

Spawn implementation sub-agent:
```
Task(subagent_type='general-purpose', prompt='Implement bead <bead-id>.
Read the bead details with `bd show <bead-id>`.
Follow existing code patterns.
Write tests for new functionality.
Run tests before finishing.
Do NOT commit - just implement and report success/failure.')
```

### Step 2.4: Verify & Commit

If implementation succeeded and tests pass:

```bash
# Stage changes
git add -A

# Check what changed
git diff --cached --stat

# Commit with bead reference
git commit -m "$(cat <<'EOF'
Implement <bead-id>: <short description>

- <key change 1>
- <key change 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Close the bead
bd close <bead-id>
bd sync

# Update counters
beads_closed++
```

Update `files_changed` list. If total unique files > 50, go to PHASE 3.

If implementation failed:
```bash
# Increment failure counters
bead_failures[<bead-id>]++
total_failures++

# If bead failed twice, skip it
if bead_failures[<bead-id>] >= 2:
    skipped_beads.append(<bead-id>)
    bd update <bead-id> --status=open  # Reset status
```

### Step 2.5: Quick Review

Spawn review sub-agent:
```
Task(subagent_type='general-purpose', prompt='/review-implementation --no-pr

Focus on the most recent commit only. Create fix beads for any issues found.
Do NOT create a PR.')
```

### Step 2.6: Handle Fix Beads

```bash
bd list --status=open --type=bug --priority=0,1
```

If critical/high fix beads exist from the review, they take priority in the next iteration.

### Step 2.7: Continue Loop

```bash
loops_completed++
bd sync
```

Go back to Step 2.1.

---

## PHASE 3: FINALIZE

Always run this phase, even if stopped early.

### Step 3.1: Final Sync

```bash
bd sync
git status
```

### Step 3.2: Generate Summary

Collect:
- Total beads closed
- Total commits made
- Files changed
- Stop reason
- Skipped beads (and why)
- Time elapsed

### Step 3.3: Create PR

```bash
# Check if there are changes to PR
if git diff main --quiet; then
    echo "No changes to create PR for"
    # Skip to cleanup
else
    git push -u origin $(git branch --show-current)

    gh pr create --title "Batch run: $(date +%Y-%m-%d)" --body "$(cat <<'EOF'
## Summary

Automated batch implementation run.

**Stats:**
- Beads closed: <N>
- Commits: <N>
- Files changed: <N>
- Duration: <time>

**Stop reason:** <reason>

## Beads Implemented

<list from bd list --status=closed>

## Skipped Beads

<list with reasons>

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
fi
```

### Step 3.4: PR Review Agent

Spawn a review agent to analyze the PR:

```
Task(subagent_type='general-purpose', prompt='You are a PR REVIEWER. Review the PR that was just created on this branch.

1. Get the PR number:
   gh pr list --head $(git branch --show-current) --json number -q ".[0].number"

2. Review all changes:
   gh pr diff <pr-number>

3. Read the PR review guide:
   Read docs/PR_REVIEW_GUIDE.md

4. Post a review comment using this structure:

gh pr comment <pr-number> --body "$(cat <<REVIEW
## Automated Code Review

### Critical Issues (must fix before merge)
<list issues that could cause bugs, security problems, or test failures>

### Recommendations (should consider)
<list improvements to code quality, patterns, or test coverage>

### Areas Needing Human Attention
<list architectural decisions, business logic, or risky changes>

### Test Coverage Assessment
<note which changes have tests and which do not>

### Summary
<overall assessment: Ready for human review / Needs fixes first>

---
🤖 Automated review by Claude Code
REVIEW
)"

Be thorough but fair. Only flag real issues, not style preferences.')
```

### Step 3.5: Response Agent

After the review is posted, spawn a response agent:

```
Task(subagent_type='general-purpose', prompt='You are a PR RESPONDER. Address the review comments on this PR.

1. Get the PR number and read the review comment:
   gh pr list --head $(git branch --show-current) --json number -q ".[0].number"
   gh pr view <pr-number> --comments

2. For each Critical Issue:
   - If fixable: implement the fix, commit, then comment "Fixed in <commit-sha>"
   - If not fixable or disagree: comment with detailed justification

3. For each Recommendation:
   - If quick to implement: do it and commit
   - If out of scope: comment explaining why (create a bead for future if warranted)

4. Push any new commits:
   git push

5. Post a final response comment:

gh pr comment <pr-number> --body "$(cat <<RESPONSE
## Review Response

### Fixes Implemented
<list fixes made with commit references>

### Deferred Items
<list items not addressed and why>

### Ready for Human Review
<yes/no and any notes for the human reviewer>

---
🤖 Response by Claude Code
RESPONSE
)"')
```

### Step 3.6: Cleanup

```bash
# Return to main
git checkout main
git pull

# Final status
echo "=== Batch Run Complete ==="
echo "PR created and reviewed. Ready for human review."
```

---

## Stop Reason Messages

Use these standard messages:

| Condition | Message |
|-----------|---------|
| No ready beads | "All ready beads completed" |
| Loop limit | "Reached maximum loops (N)" |
| Time limit | "Reached time limit (Xh)" |
| Bead limit | "Reached bead limit (N)" |
| Failure limit | "Too many failures (5 total)" |
| Test failures | "Repeated test failures on same issue" |
| File limit | "Changed too many files (50+)" |

---

## BEGIN

1. Parse arguments to determine limits
2. Start PHASE 1: SETUP
3. Enter PHASE 2: MAIN LOOP
4. When stopped, run PHASE 3: FINALIZE
