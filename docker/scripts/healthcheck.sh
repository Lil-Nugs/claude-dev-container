#!/bin/bash
# Healthcheck script for Claude Dev Container
#
# Verifies that essential tools are available and working.
# Returns 0 (healthy) if all checks pass, 1 (unhealthy) otherwise.

set -e

# Check Python is available
python3 --version > /dev/null 2>&1 || exit 1

# Check Node.js is available
node --version > /dev/null 2>&1 || exit 1

# Check git is available
git --version > /dev/null 2>&1 || exit 1

# Check GitHub CLI is available
gh --version > /dev/null 2>&1 || exit 1

# Check Claude CLI is available (optional - may not be mounted)
# This is a warning, not a failure, since Claude is mounted at runtime
if command -v claude > /dev/null 2>&1; then
    claude --version > /dev/null 2>&1 || echo "Warning: Claude CLI found but version check failed"
fi

# All checks passed
exit 0
