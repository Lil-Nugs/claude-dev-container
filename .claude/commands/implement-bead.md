---
description: Check ready beads and implement them with tests
allowed-tools: Bash(*), Read(*), Write(*), Edit(*), Glob(*), Grep(*), Task(*), TodoWrite(*), AskUserQuestion(*)
---

# Implement Ready Beads

You are tasked with implementing ready beads (issues with no blockers) from the project's issue tracker.

## Current Project State

- Git status: !`git status --short`
- Current branch: !`git branch --show-current`

## Ready Beads

!`bd ready`

## Your Task

1. **Ensure Clean Branch**: Before starting work:
   ```bash
   # Make sure you're starting from main with latest changes
   git checkout main
   git pull

   # Create a feature branch for this work
   git checkout -b feature/<descriptive-name>
   ```

2. **Review Ready Work**: Look at the ready beads shown above. Epics are organizational - focus on concrete **task** items (like `*.1`, `*.2` suffixes).

3. **Gather Details**: For each concrete task, run `bd show <id>` to understand:
   - What needs to be implemented
   - Dependencies and what this blocks
   - Any related context

4. **Check Implementation Docs**: Read relevant documentation:
   - `docs/SIMPLIFIED_PLAN.md` - MVP implementation details
   - `docs/TESTING_GUIDE.md` - Test patterns and requirements
   - `AGENT_INSTRUCTIONS.md` - Code standards and workflow

5. **Implement With Tests**: Follow the testing requirements:
   - Backend: pytest with mocking patterns from TESTING_GUIDE.md
   - Frontend: vitest + React Testing Library + MSW
   - All new code MUST have unit tests
   - Run tests before marking complete

6. **Parallel Execution**: If multiple tasks have NO dependencies on each other:
   - Use the Task tool to spawn sub-agents to work on them concurrently
   - Each sub-agent should implement one bead with its tests
   - Coordinate to avoid file conflicts

7. **Update Status**: As you work:
   - Run `bd update <id> --status=in_progress` when starting a bead
   - Run `bd close <id>` when complete with passing tests
   - Create new beads with `bd create` if you discover additional work

8. **Quality Gates** (before closing any bead):
   - Backend changes: `pytest backend/tests/unit`
   - Frontend changes: `npm test -- --run`
   - All tests must pass

## Important Notes

- Do NOT push to remote - a review agent will check the work first
- Do NOT create PRs - that happens after review
- Mark beads in_progress BEFORE starting implementation
- One bead at a time unless spawning parallel sub-agents
- Follow existing code patterns in the codebase

## Session Close Checklist

Before saying you're done:
```
[ ] All implemented beads have passing tests
[ ] Beads marked as closed in tracker
[ ] git add <changed files>
[ ] bd sync (commits bead changes)
[ ] git commit -m "Implement <bead-ids>: <summary>"
```

Do NOT push - await review first.
