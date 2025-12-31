import { test, expect } from "@playwright/test";

/**
 * E2E tests for review flow.
 * Tests the critical path of running a Claude review on the project.
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

const mockReviewResult = {
  output: `## Review Summary

### Changes Reviewed
- Added new feature X implementation
- Updated tests for feature X

### Issues Found
1. Missing edge case handling in feature X
2. Consider adding more test coverage

### Recommendations
- Add input validation
- Document the new API

Overall: **Approved with minor changes**`,
  state: "completed",
  exit_code: 0,
};

const mockReviewWithIssues = {
  output: `## Review Summary

### Critical Issues
1. **Security**: SQL injection vulnerability in user input
2. **Tests**: 3 tests are failing

### Must Fix Before Merge
- Fix SQL injection in user.py line 45
- Fix failing tests

Overall: **Changes Requested**`,
  state: "completed",
  exit_code: 0,
};

test.describe("Review Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints using ** glob to match full URLs in CI
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("**/api/projects/proj-1/beads*", async (route) => {
      await route.fulfill({ json: mockBeads });
    });

    // Catch-all for any unmocked API requests
    await page.route("**/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should execute review action", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await route.fulfill({ json: mockReviewResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Click review button (no bead selection needed for review)
    await page.click('[data-testid="action-review"]');

    // Should show reviewing state
    const reviewButton = page.locator('[data-testid="action-review"]');
    await expect(reviewButton).toContainText("Reviewing", { timeout: 2000 });

    // Wait for completion
    await expect(page.locator('[data-testid="output-view"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Review Summary"
    );
  });

  test("should show review output with recommendations", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await route.fulfill({ json: mockReviewResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and run review
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-review"]');

    // Wait for output
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Recommendations",
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Approved"
    );
  });

  test("should show critical issues in review", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await route.fulfill({ json: mockReviewWithIssues });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and run review
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-review"]');

    // Should show critical issues
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Critical Issues",
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Security"
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "Changes Requested"
    );
  });

  test("should show elapsed time during review", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({ json: mockReviewResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and start review
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-review"]');

    // Button should show timer
    const reviewButton = page.locator('[data-testid="action-review"]');
    await expect(reviewButton).toContainText(":", { timeout: 3000 });
  });

  test("should disable other actions during review", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ json: mockReviewResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Start review
    await page.click('[data-testid="action-review"]');

    // Work and push buttons should be disabled
    const workButton = page.locator('[data-testid="action-work"]');
    const pushButton = page.locator('[data-testid="action-push-pr"]');

    if (await workButton.isVisible({ timeout: 5000 })) {
      await expect(workButton).toBeDisabled();
    }
    if (await pushButton.isVisible({ timeout: 5000 })) {
      await expect(pushButton).toBeDisabled();
    }
  });

  test("should handle review API error", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: "Container not running" },
      });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and run review
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-review"]');

    // Should show error
    const outputView = page.locator('[data-testid="output-view"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    await expect(outputView.or(errorMessage).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should re-enable actions after review completes", async ({ page }) => {
    await page.route("**/api/projects/proj-1/review", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: mockReviewResult });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await expect(page.locator('[data-testid="bead-list"]')).toBeVisible();
    await page.click('[data-testid="bead-item"]:first-child');

    // Run review
    await page.click('[data-testid="action-review"]');

    // Wait for completion
    await expect(page.locator('[data-testid="output-state"]')).toContainText(
      "Completed",
      { timeout: 10000 }
    );

    // Work button should be re-enabled
    const workButton = page.locator('[data-testid="action-work"]');
    await expect(workButton).toBeEnabled({ timeout: 5000 });
  });
});
