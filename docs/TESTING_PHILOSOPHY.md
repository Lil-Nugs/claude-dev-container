# Testing Philosophy

This document explains our testing approach, why we structured it this way, and what we expect from contributors.

## Core Principles

1. **Fast feedback loops** - Developers and agents should know within seconds if they broke something
2. **Test at the right level** - Unit tests for logic, integration for boundaries, E2E for critical paths
3. **Tests as documentation** - Tests should clarify intent, not just verify behavior
4. **Confidence over coverage** - We optimize for catching real bugs, not hitting metrics

## Testing Tiers

We use a tiered testing strategy that balances speed with thoroughness:

```
┌─────────────────────────────────────────────────────┐
│                    E2E Tests                        │  ← Slowest, highest confidence
│              (Critical user journeys)               │     Minutes to run
├─────────────────────────────────────────────────────┤
│              Integration Tests                      │  ← Medium speed, system boundaries
│         (API endpoints, Docker, services)           │     <30 seconds
├─────────────────────────────────────────────────────┤
│                  Unit Tests                         │  ← Fastest, isolated logic
│          (Functions, components, utilities)         │     <5 seconds
└─────────────────────────────────────────────────────┘
```

### Tier 1: Unit Tests (Fast)

**What they test:**
- Individual functions and methods
- React component rendering and behavior
- Utility functions and helpers
- Business logic in isolation

**Characteristics:**
- No I/O (database, network, filesystem)
- Mocked dependencies
- Deterministic and parallelizable
- Target: <5 seconds for full suite

**When they run:**
| Trigger | Scope |
|---------|-------|
| On save (watch mode) | Affected tests only |
| Pre-commit hook | Full unit suite |
| PR check | Full unit suite |

### Tier 2: Integration Tests

We split integration tests into two categories:

#### Smoke Integration (<10 seconds)
Quick checks that system boundaries work:
- API endpoints return expected status codes
- Database connections succeed
- Container commands execute

**When they run:**
- Pre-push hook
- PR check

#### Full Integration (<30 seconds)
Complete integration scenarios:
- Multi-step API workflows
- Container lifecycle operations
- Service interactions

**When they run:**
- PR check only

### Tier 3: E2E Tests (Thorough)

**What they test:**
- Critical user journeys end-to-end
- Real browser interactions
- Full system integration

**Characteristics:**
- Use real browser (Playwright)
- May take minutes to run
- Catch integration issues between layers

**When they run:**
- Nightly CI run
- On merge to main
- Pre-deployment

## Test Triggers Summary

| Event | Unit | Smoke Integration | Full Integration | E2E |
|-------|------|-------------------|------------------|-----|
| File save (watch) | Affected | - | - | - |
| Pre-commit | All | - | - | - |
| Pre-push | All | All | - | - |
| PR check | All | All | All | - |
| Merge to main | All | All | All | All |
| Nightly | All | All | All | All |
| Pre-deploy | All | All | All | All |

## Coverage Goals

We don't chase coverage numbers, but we do have guidelines:

| Layer | Target | Rationale |
|-------|--------|-----------|
| Backend services | 80%+ | Core business logic, high value |
| API endpoints | 70%+ | Integration points, catch regressions |
| Frontend components | 60%+ | UI logic, but visual testing matters too |
| Utilities | 90%+ | Simple to test, widely used |

**What we don't test:**
- Boilerplate and configuration
- Third-party library internals
- Trivial getters/setters

## What Makes a Good Test

### Good Tests Are:

- **Focused** - Test one behavior per test
- **Readable** - Test name describes the scenario and expectation
- **Independent** - No shared state between tests
- **Fast** - Milliseconds for unit tests
- **Deterministic** - Same result every time

### Test Naming Convention

```python
# Python (pytest)
def test_<what>_<condition>_<expected>():
    pass

# Examples
def test_create_container_with_valid_project_returns_container_id():
def test_create_container_without_claude_cli_raises_error():
def test_list_beads_for_empty_project_returns_empty_list():
```

```typescript
// TypeScript (Vitest)
describe('ComponentName', () => {
  it('should <expected behavior> when <condition>', () => {});
});

// Examples
describe('BeadList', () => {
  it('should display loading spinner when fetching', () => {});
  it('should show empty state when no beads exist', () => {});
  it('should call onSelect when bead is clicked', () => {});
});
```

## Testing and Agents

Agents follow the same testing requirements as human developers:

1. **Write tests for new code** - Every new function/component needs tests
2. **Run tests before committing** - Never commit with failing tests
3. **Run appropriate tier** - Use the test selection guide to run relevant tests
4. **Fix broken tests** - If your change breaks tests, fix them or update them

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for specific commands and patterns.

## Continuous Integration

Our CI pipeline enforces the testing tiers:

```yaml
# Simplified view of test.yml
jobs:
  unit-tests:
    # Runs on every PR
    - pytest backend/tests/unit
    - npm test (vitest)

  integration-tests:
    # Runs on every PR
    - pytest backend/tests/integration

  e2e-tests:
    # Runs on merge to main
    - npx playwright test
```

## Trade-offs We've Made

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| E2E only on merge | Bugs found later | E2E is slow; smoke tests catch most issues |
| 80% coverage target | Some code untested | Diminishing returns above 80% |
| Mocked Docker in unit tests | Less realistic | Real Docker too slow for unit tier |
| Split integration tiers | More complexity | Keeps pre-push fast (<30s) |

## See Also

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - How to write and run tests (for agents)
- [SIMPLIFIED_PLAN.md](./SIMPLIFIED_PLAN.md) - Test stack details in MVP spec
