# Test Strategy for Agents

## Critical Rules

1. **Run the right tier of tests based on what you changed**
   - Unit tests: Always run for the files you touched
   - Smoke tests: Run before pushing
   - Full integration: Let CI handle it unless debugging

2. **Use targeted test runs, not full suite**
   ```bash
   # Good: When working on containers
   pytest backend/tests/unit/test_containers.py

   # Avoid: Running everything unnecessarily
   pytest backend/tests/
   ```

3. **Check `.test-skip` before investigating failures**
   - Known broken tests are listed in `.test-skip`
   - If a test fails and it's in `.test-skip`, move on
   - If it's new, investigate or add to `.test-skip` with issue reference

## Common Commands

### Backend (pytest)

```bash
# Unit tests for specific file
pytest backend/tests/unit/test_containers.py

# Unit tests matching pattern
pytest backend/tests/unit -k "create"

# All unit tests
pytest backend/tests/unit

# Smoke integration only
pytest -m smoke

# Skip slow tests
pytest -m "not slow"

# Verbose output (debugging)
pytest -v -s backend/tests/unit/test_containers.py
```

### Frontend (vitest)

```bash
# Tests for specific component
npm test -- BeadList

# All tests (single run, not watch)
npm test -- --run

# With coverage
npm test -- --coverage

# Verbose output
npm test -- --reporter=verbose
```

### E2E (playwright)

```bash
# All E2E tests (slow - usually let CI run these)
npx playwright test

# Specific flow
npx playwright test flows/work-flow.spec.ts

# Debug mode
npx playwright test --debug
```

## Quick Reference

| Task | Command |
|------|---------|
| Unit tests (backend) | `pytest backend/tests/unit` |
| Unit tests (frontend) | `npm test -- --run` |
| Smoke integration | `pytest -m smoke` |
| Specific backend test | `pytest backend/tests/unit/test_X.py` |
| Specific frontend test | `npm test -- ComponentName` |
| Skip known broken | Check `.test-skip` first |

## When Tests Fail

1. **Check if it's a known broken test:**
   ```bash
   cat .test-skip
   ```

2. **If it's in `.test-skip`:** Move on, it's a known issue

3. **If it's new, investigate:**
   - Run with `-v -s` for more detail
   - Check if your changes broke it
   - Check if it's flaky (run it 3 times)

4. **If unfixable now:**
   - File GitHub issue with details
   - Add to `.test-skip` with issue reference:
     ```
     # Issue #NNN: Brief description
     test_name_to_skip
     ```

## Test Isolation

**Never pollute shared state with test data.** Use isolated environments:

```bash
# Backend: Use TEST_DATABASE_URL for isolated DB
TEST_DATABASE_URL=sqlite:///tmp/test.db pytest backend/tests/

# Or use pytest fixtures that create temp directories
# (see backend/tests/conftest.py)
```

```python
# In tests, always use fixtures for isolation
@pytest.fixture
def isolated_db(tmp_path):
    """Create isolated test database."""
    db_path = tmp_path / "test.db"
    # ... setup
    yield db_path
    # ... cleanup
```

## Time Expectations

| Tier | Target | When to Run |
|------|--------|-------------|
| Unit tests | < 5 seconds | Every change |
| Smoke integration | < 10 seconds | Before push |
| Full integration | < 30 seconds | PR/CI |
| E2E | 1-5 minutes | Merge/deploy |

If tests are slower than expected, check:
- Are you running the full suite unnecessarily?
- Is there I/O that could be mocked?
- Are fixtures being recreated when they could be shared?

## Related Docs

- `docs/TESTING_GUIDE.md` - Full testing guide with patterns
- `docs/TESTING_PHILOSOPHY.md` - What to test and why
- `.test-skip` - Known broken tests to skip
