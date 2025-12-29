#!/bin/bash
# Overnight Batch Orchestrator
# Usage: ./scripts/overnight-batch.sh
#
# Runs Claude Code in headless mode to implement ALL ready beads while you sleep.
# Creates a single PR with all changes at the end.

set -e

PROMPT_FILE="$(dirname "$0")/../.claude/prompts/overnight-batch.md"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: Prompt file not found at $PROMPT_FILE"
    exit 1
fi

echo "=== Overnight Batch Orchestrator ==="
echo "Starting at: $(date)"
echo "Will run until all ready beads are complete."
echo "Running with --dangerously-skip-permissions (auto-accept all)"
echo ""

# Run Claude with:
#   --print: non-interactive mode, outputs to stdout
#   --dangerously-skip-permissions: auto-accept all tool calls (for unattended runs)
#   --verbose: show more detail about what's happening
claude --print --dangerously-skip-permissions --verbose "$(cat "$PROMPT_FILE")"

echo ""
echo "=== Completed at: $(date) ==="
