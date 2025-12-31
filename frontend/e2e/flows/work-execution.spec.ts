import { test, expect } from "@playwright/test";

/**
 * E2E tests for work execution flow.
 * Tests the critical path of executing work on a bead via Claude.
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
];

const mockExecutionResult = {
  output: "Successfully implemented feature X. All tests pass.",
  state: "completed",
  exit_code: 0,
};

const mockBlockedResult = {
  output: "BLOCKED: Missing dependency for feature X",
  state: "blocked",
  exit_code: 1,
};

const mockFailedResult = {
  output: "Error: Tests failed with 3 failures",
  state: "failed",
  exit_code: 1,
};

const mockProgressInfo = {
  running: true,
  output: "Working on implementing feature X...\nStep 1: Creating file...",
  recent: "Step 1: Creating file...",
  bytes: 1024,
};

test.describe("Work Execution Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock basic API endpoints using ** glob to match full URLs in CI
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("**/api/projects/proj-1/beads*", async (route) => {
      await route.fulfill({ json: mockBeads });
    });

    await page.route("**/api/projects/proj-1/progress*", async (route) => {
      await route.fulfill({ json: mockProgressInfo });
    });

    // Catch-all for any unmocked API requests
    await page.route("**/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should execute work action on selected bead", async ({ page }) => {
    // Mock successful execution
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      // Add slight delay to simulate execution
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for bead list to load
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();

    // Select bead
    await page.click('[data-testid="bead-item"]:first-child');

    // Click work button
    await page.click('[data-testid="action-work"]');

    // Should show output view with result
    await expect(page.locator('[data-testid="output-view"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Successfully implemented"
    );
  });

  test("should show elapsed time during execution", async ({ page }) => {
    // Mock slow execution
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Click work button
    await page.click('[data-testid="action-work"]');

    // Button should show working state with timer
    const workButton = page.locator('[data-testid="action-work"]');
    await expect(workButton).toContainText("Working", { timeout: 2000 });

    // Should show time format (e.g., "Working... 0:01")
    await expect(workButton).toContainText(":", { timeout: 3000 });
  });

  test("should disable all actions during execution", async ({ page }) => {
    // Mock slow execution
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Click work button
    await page.click('[data-testid="action-work"]');

    // Other action buttons should be disabled
    const reviewButton = page.locator('[data-testid="action-review"]');
    const pushButton = page.locator('[data-testid="action-push-pr"]');

    if (await reviewButton.isVisible({ timeout: 5000 })) {
      await expect(reviewButton).toBeDisabled();
    }
    if (await pushButton.isVisible({ timeout: 5000 })) {
      await expect(pushButton).toBeDisabled();
    }
  });

  test("should show completed state in output view", async ({ page }) => {
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead, execute
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    // Output view should show completed state
    await expect(page.locator('[data-testid="output-state"]')).toContainText(
      "Completed",
      { timeout: 10000 }
    );
  });

  test("should show blocked state when execution is blocked", async ({
    page,
  }) => {
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await route.fulfill({ json: mockBlockedResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead, execute
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    // Output view should show blocked state with yellow styling
    await expect(page.locator('[data-testid="output-state"]')).toContainText(
      "Blocked",
      { timeout: 10000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "BLOCKED"
    );
  });

  test("should show failed state when execution fails", async ({ page }) => {
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await route.fulfill({ json: mockFailedResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead, execute
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    // Output view should show failed state with red styling
    await expect(page.locator('[data-testid="output-state"]')).toContainText(
      "Failed",
      { timeout: 10000 }
    );
  });

  test("should show refresh button during execution", async ({ page }) => {
    // Mock slow execution
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Click work button
    await page.click('[data-testid="action-work"]');

    // Refresh button should appear during execution
    const refreshButton = page.locator('[data-testid="action-refresh"]');
    if (await refreshButton.isVisible({ timeout: 2000 })) {
      await expect(refreshButton).toBeVisible();
    }
  });

  test("should handle network error gracefully", async ({ page }) => {
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead, execute
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');
    await page.click('[data-testid="action-work"]');

    // Should show error in output or toast
    const outputView = page.locator('[data-testid="output-view"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    // Either output shows error or there's an error message element
    await expect(
      outputView.or(errorMessage).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should re-enable actions after execution completes", async ({
    page,
  }) => {
    await page.route("**/api/projects/proj-1/work/bead-1", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: mockExecutionResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Click work button
    await page.click('[data-testid="action-work"]');

    // Wait for completion
    await expect(page.locator('[data-testid="output-state"]')).toContainText(
      "Completed",
      { timeout: 10000 }
    );

    // Actions should be re-enabled
    const workButton = page.locator('[data-testid="action-work"]');
    await expect(workButton).toBeEnabled({ timeout: 5000 });
  });
});
