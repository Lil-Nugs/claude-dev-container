import { test, expect } from "@playwright/test";

/**
 * E2E tests for project selection flow.
 * Tests the critical path of listing and selecting projects.
 */

// Mock data matching handlers.ts structure
const mockProjects = [
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

const mockBeads = [
  {
    id: "bead-1",
    title: "Implement feature X",
    status: "open",
    description: "Add the new feature X to the application",
    priority: 1,
    type: "feature",
  },
  {
    id: "bead-2",
    title: "Fix bug in login",
    status: "in_progress",
    description: "Users cannot login with special characters",
    priority: 2,
    type: "bug",
  },
];

test.describe("Project Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints using ** glob to match full URLs in CI
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("**/api/projects/proj-1/beads*", async (route) => {
      await route.fulfill({ json: mockBeads });
    });

    await page.route("**/api/projects/proj-2/beads*", async (route) => {
      await route.fulfill({ json: [] });
    });

    // Catch-all for any unmocked API requests
    await page.route("**/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should display project list on load", async ({ page }) => {
    await page.goto("/");

    // Wait for projects to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({
      timeout: 10000,
    });

    // Should show at least one project
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);
  });

  test("should show beads when project is selected", async ({ page }) => {
    await page.goto("/");

    // Wait for project list
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({
      timeout: 10000,
    });

    // Select first project (test-project with beads)
    await page.click('[data-testid="project-card"]:first-child');

    // Beads should appear
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible({
      timeout: 5000,
    });

    // Should show beads
    const beadItems = page.locator('[data-testid="bead-item"]');
    await expect(beadItems).toHaveCount(2);
  });

  test("should show empty state when project has no beads", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for project list
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({
      timeout: 10000,
    });

    // Click on second project (no beads)
    await page.click('[data-testid="project-card"]:nth-child(2)');

    // Should show empty beads state
    await expect(page.locator('[data-testid="empty-beads"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('[data-testid="empty-beads"]')).toContainText(
      "No beads"
    );
  });

  test("should show empty state when no projects exist", async ({ page }) => {
    // Override to return empty
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/");

    await expect(page.locator('[data-testid="empty-projects"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="empty-projects"]')).toContainText(
      "No projects"
    );
  });

  test("should handle API error gracefully", async ({ page }) => {
    // Override to return error
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: "Internal server error" },
      });
    });

    await page.goto("/");

    // Should show error state
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display project name and path", async ({ page }) => {
    await page.goto("/");

    // Wait for project list
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({
      timeout: 10000,
    });

    // First project should show name
    const firstProject = page.locator('[data-testid="project-card"]').first();
    await expect(firstProject).toContainText("test-project");
  });
});
