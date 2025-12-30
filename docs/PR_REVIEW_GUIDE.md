# PR Review Guide for Agent-Generated Code

This guide is for automated and human reviewers evaluating pull requests created by AI agents during batch runs.

## Overview

Agent-generated code requires different review considerations than human-written code. Agents are thorough at following patterns but can miss context, make subtle logic errors, or over-engineer solutions.

---

## Review Checklist

### 1. Critical Issues (Block Merge)

These must be fixed before the PR can be merged:

#### Security
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Input validation on all user-facing endpoints
- [ ] No SQL injection, XSS, or command injection vulnerabilities
- [ ] Authentication/authorization checks where required
- [ ] Sensitive data not logged or exposed in errors

#### Correctness
- [ ] Business logic matches requirements (check the bead descriptions)
- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Error handling doesn't swallow exceptions silently
- [ ] Async operations properly awaited
- [ ] Database transactions used where needed

#### Breaking Changes
- [ ] API contracts not changed without migration
- [ ] No removed exports that other code depends on
- [ ] Configuration changes are backward compatible
- [ ] Database migrations are reversible

### 2. Test Coverage

- [ ] New functionality has unit tests
- [ ] Edge cases are tested
- [ ] Error paths are tested
- [ ] Mocks are appropriate (not testing mock behavior)
- [ ] Tests actually assert meaningful things (not just "it doesn't crash")

**Red flags:**
- Tests that only check happy path
- Assertions like `expect(result).toBeDefined()` without checking value
- Mocking the thing being tested
- Tests that pass regardless of implementation

### 3. Code Quality

#### Patterns & Consistency
- [ ] Follows existing codebase patterns
- [ ] Uses established utilities/helpers (not reinventing)
- [ ] Consistent naming conventions
- [ ] Proper TypeScript types (no `any` without justification)

#### Simplicity
- [ ] No over-engineering for hypothetical future needs
- [ ] No unnecessary abstractions
- [ ] Clear, readable code over clever code
- [ ] Comments explain "why" not "what"

#### Agent-Specific Issues
- [ ] No placeholder comments like `// TODO: implement`
- [ ] No commented-out code blocks
- [ ] No excessive defensive coding (checking impossible states)
- [ ] No redundant null checks on non-nullable types

### 4. Performance

- [ ] No obvious N+1 query patterns
- [ ] Large lists paginated or virtualized
- [ ] No blocking operations in hot paths
- [ ] Appropriate caching where beneficial

### 5. Integration

- [ ] Changes work with existing code (not isolated)
- [ ] API changes reflected in frontend/backend
- [ ] Database schema changes have migrations
- [ ] Environment variables documented

---

## Common Agent Mistakes to Watch For

### Over-Engineering
Agents often add unnecessary:
- Configuration for things that won't change
- Abstract base classes for single implementations
- Factories/builders for simple objects
- Error types for every possible error

**Ask:** "Is this complexity justified by actual requirements?"

### Pattern Mimicry Without Understanding
Agents copy patterns but may:
- Use authentication middleware on public endpoints
- Add database transactions for read-only operations
- Include error handling that doesn't make sense for the context

**Ask:** "Does this pattern apply to this specific situation?"

### Incomplete Implementation
Agents may:
- Implement the happy path only
- Leave error handling as generic "something went wrong"
- Not handle loading/error states in UI
- Miss cleanup (event listeners, subscriptions)

**Ask:** "What happens when things go wrong?"

### Test Theater
Tests that look comprehensive but don't actually verify behavior:
- Testing mock implementations instead of real code
- Assertions that always pass
- Missing edge case tests
- Integration tests that don't test integration

**Ask:** "Would this test fail if the implementation was wrong?"

---

## Review Comment Format

When posting review comments, structure them as:

```markdown
## Critical Issues (must fix before merge)

### [Category]: [Brief description]
**File:** `path/to/file.ts:42`
**Problem:** [What's wrong and why it matters]
**Suggested fix:** [How to resolve]

## Recommendations (should consider)

### [Category]: [Brief description]
**File:** `path/to/file.ts:42`
**Current:** [What the code does now]
**Better:** [What would be better and why]

## Areas Needing Human Attention

- [Architectural decision that needs human input]
- [Business logic that should be verified]
- [Risk area that needs extra scrutiny]

## Test Coverage Assessment

- **Well tested:** [list areas with good coverage]
- **Needs tests:** [list areas missing tests]
- **Test quality concerns:** [list tests that may be inadequate]

## Summary

[Overall assessment and recommendation]
```

---

## Severity Guidelines

### Critical (Block Merge)
- Security vulnerabilities
- Data loss or corruption risk
- Breaking changes without migration
- Crashes or unhandled errors in core paths
- Failing tests

### Major (Should Fix)
- Missing tests for new functionality
- Performance issues in common paths
- Code that doesn't follow established patterns
- Poor error messages for users

### Minor (Nice to Have)
- Code style inconsistencies
- Missing optional optimizations
- Documentation improvements
- Refactoring opportunities

---

## Human Reviewer Notes

After the automated review, human reviewers should focus on:

1. **Business Logic** - Does this actually do what the bead/ticket asked for?
2. **Architecture** - Does this fit well with the overall system design?
3. **User Experience** - How will this affect end users?
4. **Context the Agent Lacks** - Requirements not in the bead, team conventions, etc.

The automated review catches technical issues. Humans catch "is this the right thing to build?" issues.

---

## Quick Commands for Reviewers

```bash
# View PR diff
gh pr diff <pr-number>

# View PR with files changed
gh pr view <pr-number> --web

# Check out PR locally
gh pr checkout <pr-number>

# Run tests locally
npm test -- --run
pytest backend/tests/

# View PR comments
gh pr view <pr-number> --comments
```
