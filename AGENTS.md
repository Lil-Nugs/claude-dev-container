# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

This is a planning repository for **Claude Dev Container** - a mobile-first system for managing software projects with AI-powered agent execution in isolated Docker containers.

**Key Documentation:**
- `docs/DESIGN_DECISIONS.md` - Architecture choices (12 key decisions)
- `docs/AGENT_WORKFLOW.md` - Execution workflow and stopping conditions
- `docs/AGENT_CHALLENGES.md` - 12 critical issues that must be addressed
- `docs/BACKEND_PLAN.md` - FastAPI backend implementation (~18 files)
- `docs/FRONTEND_PLAN.md` - React PWA implementation (~17 files)
- `docs/CONTAINER_PLAN.md` - Docker setup and management
- `docs/IMPLEMENTATION_SUMMARY.md` - Overview and next steps

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## 🚨 Protected Branch Policy 🚨

**IMPORTANT**: The `main` branch is **PROTECTED**. You cannot push directly to main.

**Required Workflow:**
1. Create a feature branch for your work: `git checkout -b feature/your-branch-name`
2. Make your changes and commit to your branch
3. Push your feature branch: `git push -u origin feature/your-branch-name`
4. Create a Pull Request to merge your branch into `main`

**Branch Naming:**
- Features: `feature/description` or `beads-xxx-description`
- Fixes: `fix/description`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Implementation Status

**Current Phase**: Planning complete, ready for beads issue creation

**Next Steps**:
1. Review docs (especially AGENT_CHALLENGES.md)
2. Create beads issues from IMPLEMENTATION_SUMMARY.md
3. Start with Phase 0 (critical fixes)

