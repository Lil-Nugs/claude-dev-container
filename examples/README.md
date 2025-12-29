# Workflow Examples

This directory contains example workflows for agents working on Claude Dev Container.

## Available Examples

| Example | Description | When to Use |
|---------|-------------|-------------|
| [implementing-bead.md](implementing-bead.md) | Full workflow for implementing a bead | Starting work on any bead |
| [session-workflow.md](session-workflow.md) | Complete session from start to finish | Every work session |
| [adding-api-endpoint.md](adding-api-endpoint.md) | Adding a new backend endpoint | Backend implementation |
| [adding-component.md](adding-component.md) | Adding a new React component | Frontend implementation |

## Usage

These examples are templates, not scripts. Read through them to understand the workflow, then adapt to your specific task.

## Key Patterns

### Starting Work
```bash
bd ready                     # Find available work
bd show <id>                 # Review details
bd update <id> --status in_progress  # Claim it
```

### Ending Work
```bash
bd close <id> --reason "Completed: ..."
bd sync
git push
git status                   # Verify pushed
```

### Writing Resumable Notes
```bash
bd update <id> --notes "
COMPLETED: What you finished
IN PROGRESS: What you're working on
BLOCKERS: What's stuck (if any)
KEY DECISIONS: Important choices made
NEXT: What to do next
"
```
