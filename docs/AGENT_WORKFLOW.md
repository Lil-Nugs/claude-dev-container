# Agent Execution Workflow (Full Orchestration)

> **Note**: This describes the **full orchestration** workflow with state machines and automated recovery.
> For MVP, use simple prompts and manual intervention. See **SIMPLIFIED_PLAN.md**.

**Status**: Reference document (Future tiers)

---

## Overview

Two agent types with distinct responsibilities:
1. **Work Agent**: Executes individual beads autonomously in containers
2. **Review Agent**: Fresh context reviews committed work, creates new beads for issues

**MVP Simplification**: Both use simple prompt templates. You watch output and intervene manually.

---

## Work Agent Workflow

### Execution Steps

```
1. Implement the required changes
2. Create/update tests
   - ALWAYS create test suite if none exists
   - Add tests for new functionality
3. Run test suite
4. Handle test failures:
   ├─ Tests pass → Go to step 5
   └─ Tests fail → Fix and retry ONCE
      ├─ Now pass → Go to step 5
      └─ Still fail → Create "tests failing" bead → STOP
5. Commit changes
   - Format: "Bead {bead_id}: {title}"
6. Push to remote
7. Handle push failures:
   ├─ Push succeeds → SUCCESS ✅
   └─ Push fails (conflict) → Try 'git pull --rebase' then push
      ├─ Now succeeds → SUCCESS ✅
      └─ Still fails → Create "merge conflict" bead → STOP 🛑
```

### Stopping Conditions

| Condition | Action | Status Update |
|-----------|--------|---------------|
| Tests pass + committed + pushed | Success | Orchestrator → `done` |
| Tests fail after retry | Create bead, STOP | Orchestrator → keep `in_progress` |
| Git push fails after rebase | Create bead, STOP | Orchestrator → keep `in_progress` |
| Agent outputs "BLOCKED: ..." | Create bead, STOP | Orchestrator → `blocked` |
| Timeout (6 hours) | Create timeout bead | Orchestrator → `timeout` |

### Error Handling Rules

**Test Failures**:
- One retry attempt
- If still failing: Create bead with test output details
- Stop execution (don't keep trying)

**Git Conflicts**:
- One rebase attempt: `git pull --rebase` then `git push`
- If still failing: Create bead with conflict details
- Stop execution (requires human intervention)

**Agent Confusion**:
- Agent outputs: `"BLOCKED: [reason]"`
- Orchestrator creates bead with reason
- Stop execution

**Timeout Fallback**:
- If no output/progress for 6 hours
- Orchestrator creates timeout bead
- Kill container process
- Stop execution

---

## Review Agent Workflow

### Purpose
Fresh Claude context analyzes committed changes to ensure quality.

### Execution Steps

```
1. Triggered by:
   - Manual "Review" button click
   - Automatic before PR creation
2. Fetch git diff from work branch
3. Analyze changes for:
   - Bugs and edge cases
   - Missing tests
   - Code quality issues
   - Security vulnerabilities
   - Performance problems
4. Create beads for each issue found
5. Return summary of review
```

### Output Format

Review agent creates beads using structured format (JSON):
```json
{
  "issues": [
    {
      "title": "Missing error handling in API call",
      "description": "The fetchUser function doesn't handle network failures...",
      "priority": 1,
      "type": "bug",
      "severity": "high",
      "file_path": "src/api/users.ts",
      "line_numbers": [42, 45]
    }
  ],
  "summary": "Found 3 issues: 1 bug, 2 code quality improvements",
  "pr_ready": false
}
```

---

## Orchestrator Responsibilities

The backend orchestrator handles:

### Before Execution
- ✅ Check bead dependencies (not blocked)
- ✅ Ensure container available (max 3 concurrent)
- ✅ Create execution branch: `beads-{id}-{sanitized-title}`
- ✅ Build execution prompt with workflow instructions

### During Execution
- ✅ Monitor output buffer
- ✅ Detect "BLOCKED:" signals
- ✅ Track elapsed time vs timeout
- ✅ Stream output to frontend (via polling endpoint)

### After Execution
- ✅ Parse final state (success/failure/blocked)
- ✅ Update bead status accordingly
- ✅ Create beads for failures/blocks
- ✅ Run `bd sync` to persist bead changes
- ✅ Cleanup execution resources

---

## Execution Prompt Template

```python
def build_execution_prompt(bead: Bead, project: Project, user_context: str) -> str:
    return f"""
=== SYSTEM INSTRUCTIONS ===
You are working on a task in an isolated container.

TASK: Bead #{bead.id} - {bead.title}
{bead.description}

PROJECT: {project.name}
Tech Stack: {', '.join(project.tech_stack)}
Test Command: {project.test_command}

=== WORKFLOW ===
1. Implement the required changes
2. Create/update tests (ALWAYS create test suite if none exists)
3. Run test suite: {project.test_command}
4. If tests fail: Fix and retry ONCE
   - Still failing? Output test failure details and STOP
5. If tests pass:
   - Commit with message: "Bead {bead.id}: {bead.title}"
   - Push to remote
   - If push fails: try 'git pull --rebase' then push
   - If still fails: output conflict details and STOP

=== STOPPING CONDITIONS ===
✅ SUCCESS: Tests pass AND changes committed AND pushed
🛑 BLOCKED: Output "BLOCKED: [reason]" if you cannot proceed

=== CONSTRAINTS ===
- Work autonomously (no human in the loop)
- One retry attempt for test failures
- One rebase attempt for push conflicts
- Output progress clearly as you work
- Timeout: 6 hours

=== ADDITIONAL CONTEXT ===
{user_context}

=== BEGIN WORK ===
"""
```

---

## Configuration Values

| Setting | Value | Rationale |
|---------|-------|-----------|
| Execution timeout | 6 hours (21600s) | Complex tasks, dependency installs, large test suites |
| Test retry attempts | 1 | Balance autonomy vs. infinite loops |
| Git rebase attempts | 1 | Conflicts usually need human review |
| Polling interval | 5-10 seconds | Balance responsiveness vs. server load |
| Max concurrent containers | 3 | Resource limit (32GB RAM / ~8GB per container) |
| Container resources | 4 CPU, 8GB RAM | Balance performance vs. concurrency |

---

## State Machine

```
QUEUED
  ↓
RUNNING
  ├─→ COMPLETED (tests pass, committed, pushed)
  ├─→ FAILED (tests fail after retry)
  ├─→ BLOCKED (agent outputs "BLOCKED:")
  └─→ TIMEOUT (6 hours elapsed)
```

All terminal states (COMPLETED, FAILED, BLOCKED, TIMEOUT) trigger:
1. Bead status update by orchestrator
2. Optional bead creation for failures
3. `bd sync` to persist changes
4. Execution resource cleanup

---

## Key Design Principles

1. **Fresh Contexts**: No looping - failed executions create beads for new fresh attempts
2. **Explicit Stopping**: Clear signals (success/blocked/timeout) prevent ambiguity
3. **Limited Retries**: One attempt prevents infinite loops while allowing simple fixes
4. **Orchestrator Control**: Agent doesn't update its own bead status
5. **Structured Output**: Review agent uses JSON for reliable parsing
6. **Long Timeout**: 6 hours allows complex work without premature killing
