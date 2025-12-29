# Implementation Phases

**Date**: 2025-12-28
**Status**: Active - Parallel execution guide

---

## Overview

This document defines the phased implementation approach for the MVP. The key insight is that **backend and frontend can be developed in parallel** since the frontend uses MSW to mock API responses.

**Total**: 6 epics, 23 beads, ~36 files

---

## Parallel Tracks

```
Track A (Backend)              Track B (Frontend)
═══════════════════            ═══════════════════
Epic 1: Foundation        ║    Epic 4: Foundation
       ↓                  ║           ↓
Epic 2: Container         ║    Epic 5: Actions
       ↓                  ║           ↓
Epic 3: Core Actions      ╚════════════╝
              ↓
       Epic 6: PWA & Polish (E2E Integration)
```

---

## Phase Breakdown

### Phase 1: Foundations (2 parallel agents)

Start both tracks simultaneously.

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-1aa.1 | FastAPI skeleton + config + models | Backend Foundation |
| B | claude-dev-container-5qx.1 | Vite + React + Tailwind + Vitest setup | Frontend Foundation |

**Unblocks**: All subsequent work in both tracks

---

### Phase 2: Core Services (4 parallel agents)

After Phase 1 completes, these become unblocked.

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-1aa.2 | Project discovery service + tests | Backend Foundation |
| B | claude-dev-container-1aa.3 | Beads CLI wrapper service + tests | Backend Foundation |
| C | claude-dev-container-1aa.5 | pytest setup (conftest, fixtures, CI) | Backend Foundation |
| D | claude-dev-container-5qx.2 | API client + MSW tests | Frontend Foundation |

**Unblocks**: API endpoints (1aa.4), UI components (5qx.3, 5qx.4, r95.1, r95.2)

---

### Phase 3: API + UI Components (5 parallel agents)

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-1aa.4 | Project & bead API endpoints | Backend Foundation |
| B | claude-dev-container-dj5.1 | Dockerfile + base image build | Container Management |
| C | claude-dev-container-5qx.3 | ProjectList component + tests | Frontend Foundation |
| D | claude-dev-container-5qx.4 | BeadList component + tests | Frontend Foundation |
| E | claude-dev-container-r95.1 | ActionBar component + tests | Frontend Actions |
| F | claude-dev-container-r95.2 | OutputView component + tests | Frontend Actions |

**Note**: Dockerfile can start as soon as 1aa.1 is done

**Unblocks**: Container services (dj5.2, dj5.3), TerminalEmbed (r95.3)

---

### Phase 4: Container + Terminal (4 parallel agents)

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-dj5.2 | Container manager service + tests | Container Management |
| B | claude-dev-container-dj5.3 | Volume mounts configuration | Container Management |
| C | claude-dev-container-r95.3 | TerminalEmbed component | Frontend Actions |

**Unblocks**: Claude execution (dj5.4), PWA features (1l9.1, 1l9.2)

---

### Phase 5: Execution + PWA (4 parallel agents)

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-dj5.4 | Claude execution in container | Container Management |
| B | claude-dev-container-1l9.1 | PWA manifest + service worker | PWA & Polish |
| C | claude-dev-container-1l9.2 | Mobile responsive styling | PWA & Polish |

**Unblocks**: Core action endpoints (4sr.1-4), E2E tests (1l9.3)

---

### Phase 6: Core Actions (4 parallel agents)

All core action endpoints can be built in parallel.

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-4sr.1 | Work endpoint | Core Actions |
| B | claude-dev-container-4sr.2 | Review endpoint | Core Actions |
| C | claude-dev-container-4sr.3 | Push & PR endpoint | Core Actions |
| D | claude-dev-container-4sr.4 | Attach endpoint | Core Actions |

**Unblocks**: E2E tests (1l9.3)

---

### Phase 7: Integration (1 agent)

Final integration requiring full system.

| Agent | Bead | Title | Epic |
|-------|------|-------|------|
| A | claude-dev-container-1l9.3 | E2E tests (Playwright) | PWA & Polish |

**Completes**: MVP

---

## Quick Reference

### Check What's Ready
```bash
bd ready
```

### Start a Bead
```bash
bd update <bead-id> --status=in_progress
```

### Complete a Bead
```bash
bd close <bead-id>
```

### View Dependencies
```bash
bd show <bead-id>
```

### Epic Status
```bash
bd epic status
```

---

## Bead ID Reference

### Epic 1: Backend Foundation (claude-dev-container-1aa)
| ID | Title |
|----|-------|
| 1aa.1 | FastAPI skeleton + config + models |
| 1aa.2 | Project discovery service + tests |
| 1aa.3 | Beads CLI wrapper service + tests |
| 1aa.4 | Project & bead API endpoints |
| 1aa.5 | pytest setup (conftest, fixtures, CI) |

### Epic 2: Container Management (claude-dev-container-dj5)
| ID | Title |
|----|-------|
| dj5.1 | Dockerfile + base image build |
| dj5.2 | Container manager service + tests |
| dj5.3 | Volume mounts configuration |
| dj5.4 | Claude execution in container |

### Epic 3: Core Actions (claude-dev-container-4sr)
| ID | Title |
|----|-------|
| 4sr.1 | Work endpoint |
| 4sr.2 | Review endpoint |
| 4sr.3 | Push & PR endpoint |
| 4sr.4 | Attach endpoint |

### Epic 4: Frontend Foundation (claude-dev-container-5qx)
| ID | Title |
|----|-------|
| 5qx.1 | Vite + React + Tailwind + Vitest setup |
| 5qx.2 | API client + MSW tests |
| 5qx.3 | ProjectList component + tests |
| 5qx.4 | BeadList component + tests |

### Epic 5: Frontend Actions (claude-dev-container-r95)
| ID | Title |
|----|-------|
| r95.1 | ActionBar component + tests |
| r95.2 | OutputView component + tests |
| r95.3 | TerminalEmbed component |

### Epic 6: PWA & Polish (claude-dev-container-1l9)
| ID | Title |
|----|-------|
| 1l9.1 | PWA manifest + service worker |
| 1l9.2 | Mobile responsive styling |
| 1l9.3 | E2E tests (Playwright) |

---

## Estimated Parallelism

| Phase | Max Parallel Agents | Beads |
|-------|---------------------|-------|
| 1 | 2 | 2 |
| 2 | 4 | 4 |
| 3 | 6 | 6 |
| 4 | 3 | 3 |
| 5 | 3 | 3 |
| 6 | 4 | 4 |
| 7 | 1 | 1 |
| **Total** | - | **23** |

---

## See Also

- **SIMPLIFIED_PLAN.md** - Full implementation specifications
- **IMPLEMENTATION_GAPS.md** - Pre-implementation gap resolutions
- **TESTING_GUIDE.md** - Test patterns and commands
