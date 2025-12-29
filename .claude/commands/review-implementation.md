---
description: Review recent implementation, summarize fixes needed, and create beads for problems
allowed-tools: Bash(*), Read(*), Glob(*), Grep(*), Task(*), TodoWrite(*), AskUserQuestion(*)
---

# Review Implementation

You are tasked with reviewing recent implementation work and creating beads for any issues found.

## Current State

- Git status: !`git status --short`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Recently Closed Beads

!`bd list --status=closed | head -20`

## Your Task

### 1. Identify What Was Implemented

Look at the recent commits and git status to understand:
- What files were changed/added
- What features or fixes were implemented
- Which beads were completed

### 2. Review Code Quality

For each significant change, review for:

**Functionality Issues**
- Logic errors or edge cases not handled
- Missing error handling
- Incomplete implementations
- API contract mismatches

**Code Quality Issues**
- Code that doesn't follow existing patterns
- Missing or inadequate tests
- Poor separation of concerns
- Hardcoded values that should be configurable

**Security Issues**
- Input validation gaps
- Authentication/authorization issues
- Data exposure risks
- Injection vulnerabilities

**Performance Issues**
- Obvious N+1 queries or inefficient loops
- Missing indexes or caching opportunities
- Unnecessary re-renders (frontend)

### 3. Run Tests and Checks

Execute relevant test suites:
```bash
# Backend tests (if backend changes)
pytest backend/tests/unit -v

# Frontend tests (if frontend changes)
npm test -- --run

# Type checking
# Add project-specific type checks here
```

Document any failing tests or warnings.

### 4. Summarize Findings

Create a clear summary with:
- What was implemented (high-level)
- What works well
- What issues were found (categorized by severity)
  - **Critical**: Blocking issues, broken functionality, security problems
  - **Major**: Significant bugs, missing tests, poor patterns
  - **Minor**: Code style, small improvements, nice-to-haves

### 5. Create Fix Beads

For each issue found:
```bash
bd create --title="Fix: <issue description>" --type=bug --priority=<0-4>
```

Priority guidelines:
- **P0 (critical)**: Security issues, data loss, complete feature failure
- **P1 (high)**: Broken functionality, failing tests, blocking issues
- **P2 (medium)**: Missing tests, incomplete features, code quality
- **P3 (low)**: Minor improvements, refactoring opportunities
- **P4 (backlog)**: Nice-to-haves, future enhancements

Link fix beads as dependencies if they must be done in order:
```bash
bd dep add <fix-bead> <depends-on>
```

### 6. Update Report

After creating beads, provide a summary:
```
## Implementation Review Summary

### Implemented
- [List of completed features/fixes]

### Issues Found
- Critical: X issues
- Major: X issues
- Minor: X issues

### Fix Beads Created
- <bead-id>: <title> (priority)
- ...

### Ready for PR: [Yes/No]
[If No, explain what must be fixed first]
```

## Important Notes

- Do NOT fix issues directly - create beads for them
- Do NOT push to remote yet
- Focus on objective quality issues, not style preferences
- If implementation is solid, say so - don't invent problems
- Critical/security issues should be flagged clearly

## Session Close Checklist

Before saying you're done:
```
[ ] All code changes reviewed
[ ] Tests executed and results documented
[ ] Fix beads created for all found issues
[ ] bd sync (commits bead changes)
[ ] Summary provided to user
```
