"""Unit tests for beads CLI wrapper service."""

from unittest.mock import Mock, patch

import pytest

from app.models import Bead, BeadStatus, BeadType
from app.services.beads import BeadsService


class TestBeadsService:
    """Tests for BeadsService."""

    @pytest.fixture
    def service(self) -> BeadsService:
        """Create BeadsService instance with test project path."""
        return BeadsService(project_path="/test/project")

    @pytest.fixture
    def mock_subprocess(self):
        """Mock subprocess.run for bd commands."""
        with patch("app.services.beads.subprocess.run") as mock:
            yield mock

    # ==========================================================================
    # Test _run_bd_command
    # ==========================================================================

    def test_run_bd_command_without_project_path_raises(self) -> None:
        """Running bd command without project_path raises RuntimeError."""
        service = BeadsService()
        with pytest.raises(RuntimeError, match="project_path must be set"):
            service._run_bd_command(["list"])

    def test_run_bd_command_calls_subprocess(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Running bd command calls subprocess with correct arguments."""
        mock_subprocess.return_value = Mock(returncode=0, stdout="", stderr="")

        service._run_bd_command(["list", "--status", "open"])

        mock_subprocess.assert_called_once_with(
            ["bd", "list", "--status", "open"],
            cwd="/test/project",
            capture_output=True,
            text=True,
        )

    # ==========================================================================
    # Test _parse_bd_list_output
    # ==========================================================================

    def test_parse_bd_list_output_empty(self, service: BeadsService) -> None:
        """Parsing empty output returns empty list."""
        result = service._parse_bd_list_output("")
        assert result == []

    def test_parse_bd_list_output_single_bead(self, service: BeadsService) -> None:
        """Parsing single bead output returns list with one item."""
        output = "proj-abc [P1] [task] open - Implement feature X"

        result = service._parse_bd_list_output(output)

        assert len(result) == 1
        assert result[0]["id"] == "proj-abc"
        assert result[0]["title"] == "Implement feature X"
        assert result[0]["status"] == "open"
        assert result[0]["priority"] == 1
        assert result[0]["type"] == "task"

    def test_parse_bd_list_output_multiple_beads(self, service: BeadsService) -> None:
        """Parsing multiple beads output returns all items."""
        output = """proj-001 [P1] [task] open - First task
proj-002 [P2] [bug] in_progress - Fix something
proj-003 [P0] [feature] open - New feature"""

        result = service._parse_bd_list_output(output)

        assert len(result) == 3
        assert result[0]["id"] == "proj-001"
        assert result[1]["id"] == "proj-002"
        assert result[2]["id"] == "proj-003"
        assert result[1]["status"] == "in_progress"
        assert result[2]["priority"] == 0

    def test_parse_bd_list_output_ignores_invalid_lines(
        self, service: BeadsService
    ) -> None:
        """Parsing ignores lines that don't match pattern."""
        output = """Some header text
proj-abc [P1] [task] open - Valid bead
Invalid line here
Another invalid line"""

        result = service._parse_bd_list_output(output)

        assert len(result) == 1
        assert result[0]["id"] == "proj-abc"

    def test_parse_bd_list_output_handles_whitespace(
        self, service: BeadsService
    ) -> None:
        """Parsing handles leading/trailing whitespace."""
        output = """
  proj-abc [P1] [task] open - Bead with whitespace

"""

        result = service._parse_bd_list_output(output)

        assert len(result) == 1
        assert result[0]["id"] == "proj-abc"
        assert result[0]["title"] == "Bead with whitespace"

    # ==========================================================================
    # Test _parse_bd_show_output
    # ==========================================================================

    def test_parse_bd_show_output_empty(self, service: BeadsService) -> None:
        """Parsing empty show output returns None."""
        result = service._parse_bd_show_output("")
        assert result is None

    def test_parse_bd_show_output_basic(self, service: BeadsService) -> None:
        """Parsing basic show output returns bead dict."""
        output = """proj-abc: Implement feature X
Status: open
Priority: P1
Type: task"""

        result = service._parse_bd_show_output(output)

        assert result is not None
        assert result["id"] == "proj-abc"
        assert result["title"] == "Implement feature X"
        assert result["status"] == "open"
        assert result["priority"] == 1
        assert result["type"] == "task"

    def test_parse_bd_show_output_with_description(self, service: BeadsService) -> None:
        """Parsing show output with description captures it."""
        output = """proj-abc: Feature with description
Status: open
Priority: P2
Type: feature

Description:
This is a multi-line
description for the bead."""

        result = service._parse_bd_show_output(output)

        assert result is not None
        assert "This is a multi-line" in result["description"]
        assert "description for the bead" in result["description"]

    def test_parse_bd_show_output_priority_without_p(
        self, service: BeadsService
    ) -> None:
        """Parsing handles priority without P prefix."""
        output = """proj-abc: Task
Status: open
Priority: 2
Type: task"""

        result = service._parse_bd_show_output(output)

        assert result is not None
        assert result["priority"] == 2

    def test_parse_bd_show_output_no_colon_in_first_line(
        self, service: BeadsService
    ) -> None:
        """Parsing returns None if first line has no colon."""
        output = "Invalid first line without colon"

        result = service._parse_bd_show_output(output)
        assert result is None

    # ==========================================================================
    # Test _dict_to_bead
    # ==========================================================================

    def test_dict_to_bead_basic(self, service: BeadsService) -> None:
        """Converting dict to Bead creates correct model."""
        data = {
            "id": "proj-abc",
            "title": "Test bead",
            "status": "open",
            "priority": 1,
            "type": "task",
        }

        result = service._dict_to_bead(data)

        assert isinstance(result, Bead)
        assert result.id == "proj-abc"
        assert result.title == "Test bead"
        assert result.status == BeadStatus.open
        assert result.priority == 1
        assert result.type == BeadType.task

    def test_dict_to_bead_with_description(self, service: BeadsService) -> None:
        """Converting dict with description includes it."""
        data = {
            "id": "proj-abc",
            "title": "Test",
            "status": "open",
            "description": "A description",
        }

        result = service._dict_to_bead(data)

        assert result.description == "A description"

    def test_dict_to_bead_status_mapping(self, service: BeadsService) -> None:
        """Converting dict maps status strings to enums."""
        statuses = [
            ("open", BeadStatus.open),
            ("in_progress", BeadStatus.in_progress),
            ("closed", BeadStatus.closed),
        ]

        for status_str, expected_enum in statuses:
            data = {"id": "x", "title": "x", "status": status_str}
            result = service._dict_to_bead(data)
            assert result.status == expected_enum

    def test_dict_to_bead_type_mapping(self, service: BeadsService) -> None:
        """Converting dict maps type strings to enums."""
        types = [
            ("task", BeadType.task),
            ("bug", BeadType.bug),
            ("feature", BeadType.feature),
            ("epic", BeadType.epic),
        ]

        for type_str, expected_enum in types:
            data = {"id": "x", "title": "x", "status": "open", "type": type_str}
            result = service._dict_to_bead(data)
            assert result.type == expected_enum

    def test_dict_to_bead_defaults(self, service: BeadsService) -> None:
        """Converting minimal dict uses defaults."""
        data = {"id": "proj-abc", "title": "Minimal"}

        result = service._dict_to_bead(data)

        assert result.status == BeadStatus.open
        assert result.priority == 2
        assert result.type == BeadType.task
        assert result.description is None

    # ==========================================================================
    # Test list_beads
    # ==========================================================================

    def test_list_beads_success(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Listing beads returns parsed Bead objects."""
        mock_subprocess.return_value = Mock(
            returncode=0,
            stdout=(
                "proj-001 [P1] [task] open - Task one\n"
                "proj-002 [P2] [bug] in_progress - Bug fix"
            ),
            stderr="",
        )

        result = service.list_beads()

        assert len(result) == 2
        assert all(isinstance(b, Bead) for b in result)
        assert result[0].id == "proj-001"
        assert result[1].id == "proj-002"

    def test_list_beads_with_status_filter(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Listing beads with status filter passes it to command."""
        mock_subprocess.return_value = Mock(returncode=0, stdout="", stderr="")

        service.list_beads(status="in_progress")

        mock_subprocess.assert_called_once()
        args = mock_subprocess.call_args[0][0]
        assert "--status" in args
        assert "in_progress" in args

    def test_list_beads_command_failure(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Listing beads returns empty list on command failure."""
        mock_subprocess.return_value = Mock(returncode=1, stdout="", stderr="Error")

        result = service.list_beads()

        assert result == []

    # ==========================================================================
    # Test get_bead
    # ==========================================================================

    def test_get_bead_success(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting a bead returns parsed Bead object."""
        mock_subprocess.return_value = Mock(
            returncode=0,
            stdout="""proj-abc: Test bead
Status: open
Priority: P1
Type: task""",
            stderr="",
        )

        result = service.get_bead("proj-abc")

        assert result is not None
        assert isinstance(result, Bead)
        assert result.id == "proj-abc"
        assert result.title == "Test bead"

    def test_get_bead_not_found(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting nonexistent bead returns None."""
        mock_subprocess.return_value = Mock(
            returncode=1, stdout="", stderr="Bead not found"
        )

        result = service.get_bead("nonexistent")

        assert result is None

    def test_get_bead_calls_show_command(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting a bead calls bd show with bead ID."""
        mock_subprocess.return_value = Mock(returncode=1, stdout="", stderr="")

        service.get_bead("proj-xyz")

        mock_subprocess.assert_called_once()
        args = mock_subprocess.call_args[0][0]
        assert args == ["bd", "show", "proj-xyz"]

    # ==========================================================================
    # Test get_ready_beads
    # ==========================================================================

    def test_get_ready_beads_success(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting ready beads returns parsed Bead objects."""
        mock_subprocess.return_value = Mock(
            returncode=0,
            stdout="proj-001 [P1] [task] open - Ready task",
            stderr="",
        )

        result = service.get_ready_beads()

        assert len(result) == 1
        assert result[0].id == "proj-001"

    def test_get_ready_beads_calls_ready_command(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting ready beads calls bd ready."""
        mock_subprocess.return_value = Mock(returncode=0, stdout="", stderr="")

        service.get_ready_beads()

        mock_subprocess.assert_called_once()
        args = mock_subprocess.call_args[0][0]
        assert args == ["bd", "ready"]

    def test_get_ready_beads_failure(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Getting ready beads returns empty on failure."""
        mock_subprocess.return_value = Mock(returncode=1, stdout="", stderr="Error")

        result = service.get_ready_beads()

        assert result == []

    # ==========================================================================
    # Test update_bead_status
    # ==========================================================================

    def test_update_bead_status_success(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Updating bead status returns True on success."""
        mock_subprocess.return_value = Mock(returncode=0, stdout="Updated", stderr="")

        result = service.update_bead_status("proj-abc", "in_progress")

        assert result is True

    def test_update_bead_status_failure(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Updating bead status returns False on failure."""
        mock_subprocess.return_value = Mock(returncode=1, stdout="", stderr="Error")

        result = service.update_bead_status("proj-abc", "in_progress")

        assert result is False

    def test_update_bead_status_calls_update_command(
        self, service: BeadsService, mock_subprocess: Mock
    ) -> None:
        """Updating bead status calls bd update with correct args."""
        mock_subprocess.return_value = Mock(returncode=0, stdout="", stderr="")

        service.update_bead_status("proj-abc", "in_progress")

        mock_subprocess.assert_called_once()
        args = mock_subprocess.call_args[0][0]
        assert args == ["bd", "update", "proj-abc", "--status=in_progress"]
