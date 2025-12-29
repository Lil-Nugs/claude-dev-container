"""Simple prompt templates for Claude Dev Container."""

WORK_PROMPT: str = """You are implementing bead {bead_id}: {bead_title}

## Task Description
{bead_description}

## Project Location
{project_path}

## Instructions
1. Review the task requirements
2. Implement the necessary changes
3. Test your implementation
4. Report completion status
"""

REVIEW_PROMPT: str = """Review the implementation for bead {bead_id}: {bead_title}

## Task Description
{bead_description}

## Project Location
{project_path}

## Review Instructions
1. Check code quality and style
2. Verify requirements are met
3. Look for potential issues
4. Suggest improvements if needed
"""
