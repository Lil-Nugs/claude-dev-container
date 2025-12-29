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
echo ""

# Run Claude in print mode with the prompt
claude --print "$(cat "$PROMPT_FILE")"

echo ""
echo "=== Completed at: $(date) ==="
