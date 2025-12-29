---
description: Pull next ready beads after PR is opened and fix beads are resolved
allowed-tools: Bash(*), Read(*), Glob(*), Grep(*), Task(*), TodoWrite(*), AskUserQuestion(*)
---

# Pull Next Ready Beads

You are tasked with preparing the next batch of work after the previous implementation cycle is complete.

## Pre-Flight Checks

### Git Status
!`git status --short`

### Current Branch
!`git branch --show-current`

### Open PRs (if gh available)
!`gh pr list --state open 2>/dev/null || echo "gh CLI not available or not authenticated"`

## Your Task

### 1. Verify Previous Cycle Complete

Check that the previous work cycle is properly wrapped up:

**PR Status**
- Is there an open PR for the previous implementation?
- If not, ask the user if they want to create one first

**Fix Beads Status**
```bash
bd list --status=open --type=bug
```
- Are there any critical/high priority fix beads still open?
- If yes, those should be addressed before pulling new work

**Sync Status**
```bash
bd sync --status
```
- Is everything synced with remote?

### 2. Assess Ready Work

Show what's available:
```bash
bd ready
```

```bash
bd stats
```

### 3. Recommend Next Work

Based on the ready beads, recommend what to work on next:

**Priority Order**
1. Any remaining fix beads from review (bugs, P0-P1)
2. Beads that unblock other work (check `bd blocked`)
3. High-priority features/tasks
4. Medium-priority work

**Batch Size Recommendation**
- Consider complexity and dependencies
- Recommend 1-3 beads per implementation cycle
- Group related beads that touch same areas

### 4. Present Options

Provide the user with options:

```
## Next Work Options

### Option A: Continue Fixes
[If fix beads remain]
- <bead-id>: <title>
- ...

### Option B: Start New Work
[Ready beads by priority]
- <bead-id>: <title> (blocks: X other beads)
- ...

### Recommended: [A or B]
[Explanation]
```

### 5. Prepare for Implementation

Once user confirms what to work on:

1. **Create feature branch** (if not continuing on current):
```bash
git checkout main
git pull
git checkout -b <descriptive-branch-name>
```

2. **Mark beads in progress**:
```bash
bd update <bead-id> --status=in_progress
```

3. **Sync state**:
```bash
bd sync
```

4. **Provide context** for next `/implement-bead` run:
- List the selected beads
- Note any dependencies between them
- Highlight relevant files/areas

## Decision Points

Ask the user when:
- Multiple equally valid next steps exist
- Fix beads vs new features trade-off
- PR hasn't been opened yet
- There are sync conflicts

## Important Notes

- This command prepares for work, it doesn't implement
- User should run `/implement-bead` after this to start coding
- Don't skip the PR step - code review matters
- Respect the workflow: implement -> review -> fix -> PR -> next

## Output Summary

End with:
```
## Ready for Implementation

**Selected Beads:**
- <bead-id>: <title>

**Branch:** <branch-name>

**Next Step:** Run `/implement-bead` to start implementation
```
