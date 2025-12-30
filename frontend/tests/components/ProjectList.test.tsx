import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProjectList } from "../../src/components/ProjectList";
import type { Project } from "../../src/types";

const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "test-project",
    path: "/home/user/projects/test-project",
    has_beads: true,
  },
  {
    id: "proj-2",
    name: "another-project",
    path: "/home/user/projects/another-project",
    has_beads: false,
  },
];

describe("ProjectList", () => {
  describe("loading state", () => {
    it("should show loading spinner when loading", () => {
      render(
        <ProjectList
          projects={[]}
          loading={true}
          error={null}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByLabelText(/loading projects/i)).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error state with data-testid", () => {
      render(
        <ProjectList
          projects={[]}
          loading={false}
          error="Failed to connect"
          onSelect={vi.fn()}
        />
      );

      const errorState = screen.getByTestId("error-state");
      expect(errorState).toBeInTheDocument();
      expect(errorState).toHaveTextContent("Failed to load projects");
      expect(errorState).toHaveTextContent("Failed to connect");
    });

    it("should have role=alert on error state", () => {
      render(
        <ProjectList
          projects={[]}
          loading={false}
          error="Error message"
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty-projects when no projects", () => {
      render(
        <ProjectList
          projects={[]}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      const emptyState = screen.getByTestId("empty-projects");
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent("No projects");
    });
  });

  describe("project list", () => {
    it("should render project-list container with data-testid", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByTestId("project-list")).toBeInTheDocument();
    });

    it("should render project-card for each project with data-testid", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      const projectCards = screen.getAllByTestId("project-card");
      expect(projectCards).toHaveLength(2);
    });

    it("should display project name and path", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByText("test-project")).toBeInTheDocument();
      expect(
        screen.getByText("/home/user/projects/test-project")
      ).toBeInTheDocument();
    });

    it("should show beads badge for projects with beads", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      // Only first project has beads
      const beadsBadges = screen.getAllByText("beads");
      expect(beadsBadges).toHaveLength(1);
    });

    it("should call onSelect when project is clicked", () => {
      const onSelect = vi.fn();
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={onSelect}
        />
      );

      const firstProject = screen.getAllByTestId("project-card")[0];
      fireEvent.click(firstProject);

      expect(onSelect).toHaveBeenCalledWith("proj-1");
    });

    it("should call onSelect on Enter key press", () => {
      const onSelect = vi.fn();
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={onSelect}
        />
      );

      const firstProject = screen.getAllByTestId("project-card")[0];
      fireEvent.keyDown(firstProject, { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith("proj-1");
    });

    it("should highlight selected project", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          selectedProjectId="proj-1"
          onSelect={vi.fn()}
        />
      );

      const firstProject = screen.getAllByTestId("project-card")[0];
      expect(firstProject).toHaveClass("bg-blue-50");
      expect(firstProject).toHaveClass("border-blue-500");
    });

    it("should have role=button on project cards", () => {
      render(
        <ProjectList
          projects={mockProjects}
          loading={false}
          error={null}
          onSelect={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
