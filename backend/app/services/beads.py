"""Beads service for wrapping the bd CLI tool."""

import re
import subprocess
from pathlib import Path
from typing import Any

from app.models import Bead, BeadStatus, BeadType


class BeadsService:
    """Service for interacting with the beads CLI (bd)."""

    def __init__(self, project_path: Path | str | None = None) -> None:
        """Initialize the beads service.

        Args:
            project_path: Path to the project directory.
        """
        self.project_path = str(project_path) if project_path else None

    def _run_bd_command(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        """Run a bd CLI command.

        Args:
            args: Command arguments (excluding 'bd').

        Returns:
            CompletedProcess with stdout/stderr.

        Raises:
            RuntimeError: If project_path not set.
        """
        if not self.project_path:
            raise RuntimeError("project_path must be set to run bd commands")

        cmd = ["bd"] + args
        return subprocess.run(
            cmd,
            cwd=self.project_path,
            capture_output=True,
            text=True,
        )

    def _parse_bd_list_output(self, output: str) -> list[dict[str, Any]]:
        """Parse the output of bd list command.

        bd list outputs lines like:
        [P1] [open] [task] proj-abc: Title here

        Args:
            output: Raw stdout from bd list.

        Returns:
            List of parsed bead dictionaries.
        """
        beads = []
        # Pattern: [P0-4] [status] [type] id: title
        pattern = r"\[P(\d)\]\s+\[(\w+)\]\s+\[(\w+)\]\s+([^:]+):\s*(.+)"

        for line in output.strip().split("\n"):
            line = line.strip()
            if not line:
                continue

            match = re.match(pattern, line)
            if match:
                priority, status, bead_type, bead_id, title = match.groups()
                beads.append(
                    {
                        "id": bead_id.strip(),
                        "title": title.strip(),
                        "status": status,
                        "priority": int(priority),
                        "type": bead_type,
                    }
                )

        return beads

    def _parse_bd_show_output(self, output: str) -> dict[str, Any] | None:
        """Parse the output of bd show command.

        bd show outputs:
        id: Title
        Status: open
        Priority: P1
        Type: task
        ...
        Description:
        Multi-line description here

        Args:
            output: Raw stdout from bd show.

        Returns:
            Parsed bead dictionary or None if parsing fails.
        """
        if not output.strip():
            return None

        lines = output.strip().split("\n")
        if not lines:
            return None

        # First line is "id: title"
        first_line = lines[0]
        if ":" not in first_line:
            return None

        bead_id, title = first_line.split(":", 1)
        bead = {
            "id": bead_id.strip(),
            "title": title.strip(),
            "status": "open",
            "priority": 2,
            "type": "task",
            "description": "",
        }

        description_lines = []
        in_description = False

        for line in lines[1:]:
            if in_description:
                description_lines.append(line)
                continue

            if line.startswith("Description:"):
                in_description = True
                # Check if description is on same line
                desc_part = line[len("Description:") :].strip()
                if desc_part:
                    description_lines.append(desc_part)
                continue

            if line.startswith("Status:"):
                bead["status"] = line.split(":", 1)[1].strip()
            elif line.startswith("Priority:"):
                # Priority can be "P1" or "1"
                prio_str = line.split(":", 1)[1].strip()
                prio_str = prio_str.replace("P", "")
                try:
                    bead["priority"] = int(prio_str)
                except ValueError:
                    pass
            elif line.startswith("Type:"):
                bead["type"] = line.split(":", 1)[1].strip()

        if description_lines:
            bead["description"] = "\n".join(description_lines).strip()

        return bead

    def _dict_to_bead(self, data: dict[str, Any]) -> Bead:
        """Convert a dictionary to a Bead model.

        Args:
            data: Dictionary with bead data.

        Returns:
            Bead model instance.
        """
        # Map status string to enum
        status_map = {
            "open": BeadStatus.open,
            "in_progress": BeadStatus.in_progress,
            "closed": BeadStatus.closed,
        }
        status = status_map.get(data.get("status", "open"), BeadStatus.open)

        # Map type string to enum
        type_map = {
            "task": BeadType.task,
            "bug": BeadType.bug,
            "feature": BeadType.feature,
            "epic": BeadType.epic,
        }
        bead_type = type_map.get(data.get("type", "task"), BeadType.task)

        return Bead(
            id=data["id"],
            title=data["title"],
            status=status,
            description=data.get("description"),
            priority=data.get("priority", 2),
            type=bead_type,
        )

    def list_beads(self, status: str | None = None) -> list[Bead]:
        """List beads in the project.

        Args:
            status: Optional status filter (open, in_progress, closed).

        Returns:
            List of Bead objects.
        """
        args = ["list"]
        if status:
            args.extend(["--status", status])

        result = self._run_bd_command(args)
        if result.returncode != 0:
            return []

        parsed = self._parse_bd_list_output(result.stdout)
        return [self._dict_to_bead(d) for d in parsed]

    def get_bead(self, bead_id: str) -> Bead | None:
        """Get a specific bead by ID.

        Args:
            bead_id: The bead identifier.

        Returns:
            Bead if found, None otherwise.
        """
        result = self._run_bd_command(["show", bead_id])
        if result.returncode != 0:
            return None

        parsed = self._parse_bd_show_output(result.stdout)
        if not parsed:
            return None

        return self._dict_to_bead(parsed)

    def get_ready_beads(self) -> list[Bead]:
        """Get beads that are ready to work on (no blockers).

        Returns:
            List of ready Bead objects.
        """
        result = self._run_bd_command(["ready"])
        if result.returncode != 0:
            return []

        parsed = self._parse_bd_list_output(result.stdout)
        return [self._dict_to_bead(d) for d in parsed]

    def update_bead_status(self, bead_id: str, status: str) -> bool:
        """Update a bead's status.

        Args:
            bead_id: The bead identifier.
            status: New status value (open, in_progress).

        Returns:
            True if update succeeded, False otherwise.
        """
        result = self._run_bd_command(["update", bead_id, f"--status={status}"])
        return result.returncode == 0
