import { test, expect } from "@playwright/test";

/**
 * E2E tests for bead listing flow.
 * Tests the bead list display, selection, and filtering.
 */

const mockProjects = [
  {
    id: "proj-1",
    name: "test-project",
    path: "/home/user/projects/test-project",
    has_beads: true,
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
  {
    id: "bead-3",
    title: "Update documentation",
    status: "closed",
    description: "Update README with new API endpoints",
    priority: 3,
    type: "task",
  },
];

test.describe("Bead Listing", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints
    await page.route("/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("/api/projects/proj-1/beads*", async (route) => {
      const url = new URL(route.request().url());
      const statusFilter = url.searchParams.get("status");

      if (statusFilter) {
        const filtered = mockBeads.filter((b) => b.status === statusFilter);
        await route.fulfill({ json: filtered });
      } else {
        await route.fulfill({ json: mockBeads });
      }
    });
  });

  test("should display all beads for selected project", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Should show all beads
    const beadItems = page.locator('[data-testid="bead-item"]');
    await expect(beadItems).toHaveCount(3);
  });

  test("should highlight selected bead", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads to load
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // Click on first bead
    const firstBead = page.locator('[data-testid="bead-item"]').first();
    await firstBead.click();

    // Should have selected styling (bg-blue-50 or selected class)
    await expect(firstBead).toHaveClass(/bg-blue-50|selected/);
  });

  test("should display bead details when selected", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads and click first one
    await page.click('[data-testid="bead-item"]:first-child');

    // Should show bead details panel or inline details
    // The bead item should show the ID and title
    const firstBead = page.locator('[data-testid="bead-item"]').first();
    await expect(firstBead).toContainText("bead-1");
    await expect(firstBead).toContainText("Implement feature X");
  });

  test("should show bead priority and status badges", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // First bead should show P1 priority and open status
    const firstBead = page.locator('[data-testid="bead-item"]').first();
    await expect(firstBead).toContainText("P1");
    await expect(firstBead).toContainText("open");

    // Second bead should show in_progress
    const secondBead = page.locator('[data-testid="bead-item"]').nth(1);
    await expect(secondBead).toContainText("in progress");
  });

  test("should show loading state while fetching beads", async ({ page }) => {
    // Add delay to API response
    await page.route("/api/projects/proj-1/beads", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: mockBeads });
    });

    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Should show loading spinner
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // Then show beads
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
  });

  test("should filter beads by status when filter is applied", async ({
    page,
  }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // If there's a status filter, click it
    const statusFilter = page.locator('[data-testid="filter-status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('text=In Progress');

      // Should only show in_progress beads
      const beadItems = page.locator('[data-testid="bead-item"]');
      await expect(beadItems).toHaveCount(1);
      await expect(beadItems.first()).toContainText("in progress");
    }
  });

  test("should enable work button when bead is selected", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // Work button should be disabled initially
    const workButton = page.locator('[data-testid="action-work"]');
    if (await workButton.isVisible()) {
      await expect(workButton).toBeDisabled();

      // Select a bead
      await page.click('[data-testid="bead-item"]:first-child');

      // Now work button should be enabled
      await expect(workButton).toBeEnabled();
    }
  });

  test("should display bead type badge", async ({ page }) => {
    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for beads
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // First bead should show "feature" type
    const firstBead = page.locator('[data-testid="bead-item"]').first();
    await expect(firstBead).toContainText("feature");

    // Second bead should show "bug" type
    const secondBead = page.locator('[data-testid="bead-item"]').nth(1);
    await expect(secondBead).toContainText("bug");
  });
});
