# Project Review Session Prompt

Run this prompt to perform a comprehensive review of the codebase using parallel sub-agents.

---

## Mission

You are conducting a comprehensive project review after implementing the first batch of epics. Your goal is to:

1. Ensure all tests pass (none skipped, none failing)
2. Verify all necessary components are in place for tests to pass
3. Identify gaps, broken functionality, and missing pieces
4. Log all findings as beads issues for future work

---

## Sub-Agent Deployment

Launch **ALL of the following agents in parallel** using the Task tool. Each agent focuses on a specific area.

### Agent 1: Unit Test Reviewer
```
Review all unit tests in the project:

1. Run: `cd frontend && npm test -- --run`
2. Identify any skipped tests (look for .skip, .todo, or xit/xdescribe)
3. Identify any failing tests
4. For each failure or skip, determine:
   - What component/function is being tested
   - What is missing or broken that prevents the test from passing
   - Is this a test bug or an implementation bug?

Create beads issues for each problem found using `bd create`:
- Use type=bug for broken tests
- Use type=task for missing implementations
- Priority P2 for most, P1 for critical path items
- Title format: "Fix: [component] - [specific issue]"

If tests relate to an existing epic, use `bd dep add <new-issue> <epic>` to link them.
If no related epic exists, create one with `bd create --type=epic --title="[Area] Test Fixes"`.

Output a summary of findings at the end.
```

### Agent 2: E2E Test Reviewer
```
Review all E2E/Playwright tests:

1. Check all files in frontend/e2e/flows/*.spec.ts
2. Look for:
   - Tests marked with .skip or test.skip
   - Commented out tests
   - TODO comments indicating incomplete tests
   - Tests that might fail due to missing UI elements (data-testid, selectors)
3. Run `cd frontend && npx playwright test --list` to see all tests
4. Attempt to run E2E tests: `cd frontend && npm run test:e2e`

For each issue found:
- Create a bead with `bd create --type=task --priority=2`
- Check if issue claude-dev-container-8ex relates (data-testid fixes)
- Link related issues with `bd dep add`

Document which E2E flows are working vs broken.
```

### Agent 3: Frontend Component Reviewer
```
Review the frontend implementation:

1. Check frontend/src/components/ for all components
2. Verify each component:
   - Has proper TypeScript types
   - Has error handling where needed
   - Uses consistent patterns with other components
   - Has data-testid attributes for testing
3. Check frontend/src/pages/ for page completeness
4. Verify frontend/src/api/ matches backend endpoints

For gaps found:
- Create issues with `bd create --type=task`
- Group related issues under appropriate epics
- Use priority P3 for polish items, P2 for functional gaps

List all components reviewed and their status.
```

### Agent 4: Backend API Reviewer
```
Review the backend implementation:

1. Check backend/ for all API endpoints
2. Verify each endpoint:
   - Has proper error handling
   - Returns consistent response formats
   - Has input validation
3. Check backend/requirements.txt for dependencies
4. Run any backend tests if they exist: `cd backend && python -m pytest` (if applicable)
5. Verify Docker configuration in docker/

For issues found:
- Create beads with `bd create --type=bug|task`
- Priority P1 for security/data issues, P2 for functionality

List all endpoints and their review status.
```

### Agent 5: CI/CD & Integration Reviewer
```
Review CI/CD and integration:

1. Check .github/workflows/ for all workflow files
2. Verify:
   - All test jobs are properly configured
   - No jobs are skipped or disabled
   - Dependencies are correctly installed
3. Check that build process works: `cd frontend && npm run build`
4. Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`
5. Check for lint issues: `cd frontend && npm run lint` (if exists)

For issues found:
- Create beads with appropriate type and priority
- Link to existing issue claude-dev-container-9bs if Docker CI related

Report on CI/CD health status.
```

---

## Rules for All Agents

### Issue Creation Rules

1. **Always search before creating**: Run `bd search "keyword"` or `bd list` to check if issue exists
2. **Use correct priority scale**: 0-4 or P0-P4 (NOT high/medium/low)
   - P0: Critical - blocks all work
   - P1: High - core functionality broken
   - P2: Medium - standard issues (default)
   - P3: Low - polish, improvements
   - P4: Backlog - nice to have
3. **Use correct type**: bug, task, feature, or epic
4. **Link dependencies**: If issue B can't be done until A is done, run `bd dep add B A`
5. **Create epics for groups**: If you find 3+ related issues, create an epic first

### Issue Title Format

```
[Type]: [Component/Area] - [Specific Problem]
```

Examples:
- "Fix: BeadList component - Missing data-testid for row elements"
- "Task: E2E tests - Enable skipped terminal access tests"
- "Bug: API client - Incorrect error handling for 404 responses"

### When to Create an Epic

Create an epic when:
- You find 3+ related issues that should be grouped
- There's a significant area of work not covered by existing epics
- Multiple components need coordinated changes

Epic title format:
```
[Area/Feature] [Work Type]
```

Examples:
- "E2E Test Stabilization"
- "Frontend Component Testing"
- "API Error Handling Improvements"

### Closing Protocol

Each agent MUST at the end:
1. Run `bd sync` to commit bead changes
2. Provide a structured summary:
   - Number of issues created
   - Number of epics created
   - List of critical (P0/P1) issues
   - Overall health assessment

---

## Session Orchestration

After all agents complete:

1. Run `bd stats` to see updated project status
2. Run `bd blocked` to see the dependency graph
3. Run `bd ready` to see what's actionable
4. Create a summary issue if needed: `bd create --type=task --title="Review Session Summary" --priority=3`

### Final Sync

```bash
git status
bd sync
git add -A
git commit -m "Review session: add issues for test fixes and implementation gaps"
bd sync
git push
```

---

## Quick Reference

```bash
# Beads commands
bd list                    # List all issues
bd list --status=open      # Open issues only
bd search "test"           # Search issues
bd create --title="..." --type=task --priority=2
bd dep add <issue> <depends-on>
bd show <id>               # View issue details
bd sync                    # Sync with git

# Test commands
cd frontend && npm test -- --run     # Unit tests
cd frontend && npm run test:e2e      # E2E tests
cd frontend && npx tsc --noEmit      # Type check
cd frontend && npm run build         # Build
```

---

## Success Criteria

The review is successful when:
- [ ] All test files have been examined
- [ ] All skipped/failing tests have corresponding beads
- [ ] All issues are properly linked to epics
- [ ] Dependencies between issues are mapped
- [ ] `bd sync` has been run by all agents
- [ ] Final git commit and push completed
