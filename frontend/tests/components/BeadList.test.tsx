import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { BeadList } from "../../src/components/BeadList";
import type { Bead } from "../../src/types";

describe("BeadList", () => {
  const mockBeads: Bead[] = [
    {
      id: "beads-001",
      title: "Fix bug",
      status: "open",
      description: "Fix the authentication bug",
      priority: 1,
      type: "bug",
    },
    {
      id: "beads-002",
      title: "Add feature",
      status: "in_progress",
      description: "Add new login feature",
      priority: 2,
      type: "feature",
    },
    {
      id: "beads-003",
      title: "Write tests",
      status: "closed",
      priority: 3,
      type: "task",
    },
  ];

  it("should display loading spinner when fetching", () => {
    render(<BeadList beads={[]} loading={true} onSelect={vi.fn()} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show empty state when no beads exist", () => {
    render(<BeadList beads={[]} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText(/no beads found/i)).toBeInTheDocument();
  });

  it("should render all beads", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Fix bug")).toBeInTheDocument();
    expect(screen.getByText("Add feature")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("should display bead IDs", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("beads-001")).toBeInTheDocument();
    expect(screen.getByText("beads-002")).toBeInTheDocument();
    expect(screen.getByText("beads-003")).toBeInTheDocument();
  });

  it("should display bead descriptions when available", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Fix the authentication bug")).toBeInTheDocument();
    expect(screen.getByText("Add new login feature")).toBeInTheDocument();
  });

  it("should display bead status badges", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("in progress")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("should display bead type badges", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("feature")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
  });

  it("should display bead priorities", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText("P3")).toBeInTheDocument();
  });

  it("should call onSelect when bead is clicked", () => {
    const onSelect = vi.fn();
    render(<BeadList beads={mockBeads} loading={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Fix bug"));

    expect(onSelect).toHaveBeenCalledWith("beads-001");
  });

  it("should call onSelect when Enter key is pressed on bead", () => {
    const onSelect = vi.fn();
    render(<BeadList beads={mockBeads} loading={false} onSelect={onSelect} />);

    const beadItems = screen.getAllByTestId("bead-item");
    fireEvent.keyDown(beadItems[0], { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("beads-001");
  });

  it("should call onSelect when Space key is pressed on bead", () => {
    const onSelect = vi.fn();
    render(<BeadList beads={mockBeads} loading={false} onSelect={onSelect} />);

    const beadItems = screen.getAllByTestId("bead-item");
    fireEvent.keyDown(beadItems[1], { key: " " });

    expect(onSelect).toHaveBeenCalledWith("beads-002");
  });

  it("should highlight selected bead", () => {
    render(
      <BeadList
        beads={mockBeads}
        loading={false}
        onSelect={vi.fn()}
        selectedBeadId="beads-001"
      />
    );

    const beadItems = screen.getAllByTestId("bead-item");
    expect(beadItems[0]).toHaveClass("bg-blue-50");
    expect(beadItems[1]).not.toHaveClass("bg-blue-50");
  });

  it("should not call onSelect while loading", () => {
    const onSelect = vi.fn();
    render(<BeadList beads={mockBeads} loading={true} onSelect={onSelect} />);

    // Loading state shows spinner, not bead list
    expect(screen.queryByText("Fix bug")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should have correct accessibility attributes", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    const beadItems = screen.getAllByTestId("bead-item");
    beadItems.forEach((item) => {
      expect(item).toHaveAttribute("role", "button");
      expect(item).toHaveAttribute("tabIndex", "0");
    });
  });

  it("should render bead list container with correct test id", () => {
    render(<BeadList beads={mockBeads} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("bead-list")).toBeInTheDocument();
  });

  it("should handle epic type beads", () => {
    const epicBead: Bead = {
      id: "epic-001",
      title: "Epic project",
      status: "open",
      priority: 1,
      type: "epic",
    };

    render(<BeadList beads={[epicBead]} loading={false} onSelect={vi.fn()} />);

    expect(screen.getByText("epic")).toBeInTheDocument();
  });
});
