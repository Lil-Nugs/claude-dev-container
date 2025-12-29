# Documentation Overview

This folder contains planning and architecture documentation for Claude Dev Container.

## Quick Navigation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **SIMPLIFIED_PLAN.md** | MVP implementation spec | Starting any implementation work |
| **IMPLEMENTATION_PHASES.md** | Parallel execution guide | Coordinating multi-agent work |
| **IMPLEMENTATION_GAPS.md** | Pre-implementation gaps | Before implementing frontend |
| **IMPLEMENTATION_SUMMARY.md** | Overview of approach | Understanding the project split |
| **DESIGN_DECISIONS.md** | Architecture rationale | Before making architectural choices |
| **TESTING_GUIDE.md** | How to write and run tests | Before writing or running tests |
| **TESTING_PHILOSOPHY.md** | Testing tiers and rationale | Understanding test strategy |
| **TROUBLESHOOTING.md** | Common issues and recovery | When stuck or hitting errors |
| **FUTURE_ENHANCEMENTS.md** | Deferred features | After MVP, planning next phase |

## Related Documentation

| Location | Purpose |
|----------|---------|
| `../AGENTS.md` | Project entry point, quick reference |
| `../AGENT_INSTRUCTIONS.md` | Detailed operations, code standards, workflows |
| `../examples/` | Workflow templates and patterns |
| `../templates/` | Module README templates |

## Document Categories

### MVP (Active)

These documents define what we're building now:

- **SIMPLIFIED_PLAN.md** - Complete MVP specification with code examples, file structure, and test requirements. This is the primary implementation target.
- **IMPLEMENTATION_PHASES.md** - Phased implementation guide with parallel execution tracks. Use for coordinating multi-agent work and understanding dependencies.
- **IMPLEMENTATION_GAPS.md** - Documents gaps between specs and implementation readiness (TypeScript types, MSW handlers). Review before starting frontend work.
- **IMPLEMENTATION_SUMMARY.md** - High-level overview explaining the simplified vs full approach split.
- **DESIGN_DECISIONS.md** - 12 key architectural decisions with rationale and alternatives considered.
- **TESTING_GUIDE.md** - How to write tests, which tests to run, file locations, and patterns. Primary reference for agents.
- **TESTING_PHILOSOPHY.md** - Testing tiers (unit/integration/E2E), when each runs, and coverage goals.
- **TROUBLESHOOTING.md** - Common issues and solutions for git, Docker, backend, frontend, and beads.

### Reference (Future)

These documents describe the full orchestration system. Use them as reference when implementing Tier 2/3 features from FUTURE_ENHANCEMENTS.md:

- **FUTURE_ENHANCEMENTS.md** - Catalog of deferred features organized in 3 tiers (18 total beads)
- **BACKEND_PLAN.md** - Full backend with state machine, recovery, concurrent execution
- **FRONTEND_PLAN.md** - Full frontend with streaming, execution history, complex state
- **CONTAINER_PLAN.md** - Full container setup with health monitoring, resource limits
- **AGENT_WORKFLOW.md** - Orchestration workflows for automated pipelines
- **AGENT_CHALLENGES.md** - Technical challenges that automation features solve

### Superseded

- **IMPLEMENTATION_PLAN.md** - Original detailed plan, now replaced by SIMPLIFIED_PLAN.md

## Reading Order

**For new agents:**
1. Read `../AGENTS.md` first (project entry point)
2. Read `SIMPLIFIED_PLAN.md` for implementation details
3. Reference `DESIGN_DECISIONS.md` when making architectural choices

**For adding future features:**
1. Check `FUTURE_ENHANCEMENTS.md` for the feature tier
2. Reference the corresponding full plan (BACKEND/FRONTEND/CONTAINER_PLAN.md)
3. Follow patterns established in MVP code

## Maintenance

When updating documentation:
- Keep MVP docs focused on current implementation
- Add new future features to FUTURE_ENHANCEMENTS.md with tier assignment
- Update cross-references in "See Also" sections
- Ensure AGENTS.md stays in sync with this overview
