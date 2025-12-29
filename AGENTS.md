# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

This is a planning repository for **Claude Dev Container** - a mobile-first system for managing software projects with AI-powered agent execution in isolated Docker containers.

## Documentation

### Primary (MVP)
- `docs/SIMPLIFIED_PLAN.md` - **Start here** - MVP implementation (6 beads, ~19 files)
- `docs/IMPLEMENTATION_SUMMARY.md` - Overview and next steps
- `docs/DESIGN_DECISIONS.md` - Architecture choices (12 key decisions)
- `docs/TESTING_GUIDE.md` - **How to write and run tests** (for agents)
- `docs/TESTING_PHILOSOPHY.md` - Testing tiers and rationale

### Reference (Future)
- `docs/FUTURE_ENHANCEMENTS.md` - Deferred automation features (Tier 1/2/3)
- `docs/BACKEND_PLAN.md` - Full orchestration backend (reference)
- `docs/FRONTEND_PLAN.md` - Full orchestration frontend (reference)
- `docs/CONTAINER_PLAN.md` - Full container setup (reference)
- `docs/AGENT_WORKFLOW.md` - Full orchestration workflows (reference)
- `docs/AGENT_CHALLENGES.md` - Challenges solved by automation (reference)

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

**Current Phase**: Planning complete, ready for MVP implementation

**Approach**: Simplified MVP first (6 epics, 23 beads), then add automation features as needed.

**Next Steps**:
1. Review `docs/SIMPLIFIED_PLAN.md` (primary implementation target)
2. Create 6 epics and 23 beads
3. Start with Epic 1 (Backend foundation)

**MVP Epics**:
| Epic | Beads | Focus |
|------|-------|-------|
| 1. Backend Foundation | 5 | API + services + pytest |
| 2. Container Management | 4 | Docker + execution |
| 3. Core Actions | 4 | Work/Review/Push endpoints |
| 4. Frontend Foundation | 4 | React + Vitest setup |
| 5. Frontend Actions | 3 | UI components |
| 6. PWA & Polish | 3 | Mobile + E2E tests |

**Testing Requirements**:
- All beads must include unit tests for new code
- Agents must run tests before committing
- CI must pass before PRs are merged
- See `docs/TESTING_GUIDE.md` for which tests to run based on changes

## Module README Convention

Each major directory should have a README.md that helps agents quickly understand:

```
module/
└── README.md    # 20-50 lines summarizing the module
```

**Required sections:**

```markdown
# Module Name

Brief description (1-2 sentences).

## Key Files
- `file.py` - What it does
- `other.py` - What it does

## Dependencies
- What this module depends on
- What depends on this module

## Testing
How to run tests for this module.
```

**Guidelines:**
- Keep it short (20-50 lines) - this is a summary, not documentation
- Focus on "what's here" and "how it connects"
- Update when adding significant new files
- Don't duplicate AGENTS.md content

**Current module READMEs:**
- `docs/README.md` - Documentation overview and reading order

**Create READMEs when implementing:**
- `backend/README.md` - API structure and services
- `frontend/README.md` - Component architecture
- `docker/README.md` - Container setup

