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

## Anti-Patterns to Avoid

### 1. Trivial Assertions

Testing obvious happy paths that would pass with trivial implementations.

```python
# BAD: What bug would this catch?
def test_create_container_works():
    result = container_service.create("/valid/path")
    assert result is not None

# GOOD: Test the interesting cases
def test_create_container_rejects_nonexistent_path():
    with pytest.raises(ValueError, match="path does not exist"):
        container_service.create("/nonexistent/path")

def test_create_container_rejects_path_without_git():
    with pytest.raises(ValueError, match="not a git repository"):
        container_service.create("/path/without/.git")
```

### 2. Duplicate Error Path Testing

Testing the same logic multiple ways instead of once with table-driven tests.

```python
# BAD: Repetitive individual tests
def test_priority_0(): assert map_priority(0) == "critical"
def test_priority_1(): assert map_priority(1) == "high"
def test_priority_2(): assert map_priority(2) == "medium"

# GOOD: Table-driven
@pytest.mark.parametrize("input,expected", [
    (0, "critical"),
    (1, "high"),
    (2, "medium"),
    (99, "unknown"),  # boundary case
])
def test_priority_mapping(input, expected):
    assert map_priority(input) == expected
```

### 3. I/O Heavy Tests Without Mocking

Unit tests that execute real commands or heavy I/O when they could mock.

```python
# BAD: Actually runs Docker in unit test
def test_container_creation():
    result = subprocess.run(["docker", "run", ...])
    assert result.returncode == 0

# GOOD: Mock the execution
def test_container_creation(mock_docker):
    mock_docker.containers.run.return_value = Mock(id="abc123")
    result = container_service.create("/path")
    assert result == "abc123"
    mock_docker.containers.run.assert_called_once()
```

### 4. Testing Implementation, Not Behavior

Tests that break when you refactor, even though behavior is unchanged.

```typescript
// BAD: Tests internal state
it('should have 3 items in internal cache', () => {
  component.loadData();
  expect(component._internalCache.length).toBe(3);
});

// GOOD: Tests observable behavior
it('should display 3 items after loading', () => {
  render(<BeadList />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});
```

### 5. Missing Boundary Tests

Testing known-good values but not boundaries and invalid inputs.

```python
# BAD: Only tests middle values
def test_priority_1(): assert validate_priority(1) is True
def test_priority_2(): assert validate_priority(2) is True

# GOOD: Tests boundaries and invalid
@pytest.mark.parametrize("value,valid", [
    (-1, False),  # invalid - below range
    (0, True),    # boundary - min valid
    (4, True),    # boundary - max valid
    (5, False),   # boundary - first invalid
    (None, False), # edge case
])
def test_priority_validation(value, valid):
    assert validate_priority(value) == valid
```

---

## What to Test (Priority Matrix)

| Priority | What | Why | Examples |
|----------|------|-----|----------|
| **High** | Core business logic | Users depend on this | Container lifecycle, bead operations |
| **High** | Error paths that corrupt data | Data loss is catastrophic | Database operations, file writes |
| **Medium** | Edge cases from bugs | Discovered through real issues | Input validation, state transitions |
| **Low** | Display/formatting | Visual output, manually verified | Table formatting, color output |

---

## Target Metrics

### Test-to-Code Ratio

| Ratio | Interpretation | When Appropriate |
|-------|----------------|------------------|
| 0.5:1 | Light coverage | Utilities, prototypes |
| 1:1 | Solid coverage | **Our target for most code** |
| 1.5:1 | Heavy coverage | Critical/security-sensitive |
| 2:1+ | Over-engineered | Likely maintenance burden |

### Time Budgets

| Tier | Target | Hard Limit |
|------|--------|------------|
| Unit tests | < 5 seconds | 10 seconds |
| Smoke integration | < 10 seconds | 20 seconds |
| Full integration | < 30 seconds | 60 seconds |
| E2E | < 5 minutes | 10 minutes |

If tests exceed hard limits, investigate:
- Unnecessary I/O that could be mocked
- Tests that belong in a different tier
- Shared setup that could be optimized

---

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

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - How to write and run tests
- [../.claude/test-strategy.md](../.claude/test-strategy.md) - Quick reference for agents
- [SIMPLIFIED_PLAN.md](./SIMPLIFIED_PLAN.md) - Test stack details in MVP spec
