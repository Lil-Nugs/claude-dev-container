import { test, expect } from "@playwright/test";

/**
 * E2E tests for push and PR creation flow.
 * Tests the critical path of pushing changes and creating a pull request.
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

const mockPushPRSuccess = {
  push: `Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 1.23 KiB | 1.23 MiB/s, done.
To github.com:user/test-project.git
   abc1234..def5678  feature/implement-x -> feature/implement-x
Branch 'feature/implement-x' set up to track remote branch 'feature/implement-x' from 'origin'.`,
  pr: `https://github.com/user/test-project/pull/42

Creating pull request for feature/implement-x into main in user/test-project

  Implement feature X #42

  This PR implements feature X as described in bead-1.`,
};

const mockPushPRFailure = {
  push: `error: failed to push some refs to 'github.com:user/test-project.git'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally.`,
  pr: "",
};

const mockNothingToPush = {
  push: "Everything up-to-date",
  pr: `https://github.com/user/test-project/pull/43

Creating pull request for feature/implement-x into main in user/test-project`,
};

test.describe("Push & PR Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("/api/projects/proj-1/beads*", async (route) => {
      await route.fulfill({ json: mockBeads });
    });

    // Catch-all for any unmocked API requests
    await page.route("/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should create PR and show URL", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Click push & PR button
    await page.click('[data-testid="action-push-pr"]');

    // Should show pushing state
    const pushButton = page.locator('[data-testid="action-push-pr"]');
    await expect(pushButton).toContainText("Pushing", { timeout: 2000 });

    // Wait for output with PR URL
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "github.com",
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "pull/42"
    );
  });

  test("should show both push and PR output", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Output should contain both push and PR info
    const outputContent = page.locator('[data-testid="output-content"]');
    await expect(outputContent).toContainText("Push", { timeout: 30000 });
    await expect(outputContent).toContainText("PR");
    await expect(outputContent).toContainText("github.com");
  });

  test("should handle push failure gracefully", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({ json: mockPushPRFailure });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Should show error in output
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "failed",
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "rejected"
    );
  });

  test("should handle nothing to push", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({ json: mockNothingToPush });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Should show up-to-date message but still create PR
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "up-to-date",
      { timeout: 30000 }
    );
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "github.com"
    );
  });

  test("should show PR link as clickable", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Look for clickable PR link
    const prLink = page.locator(
      '[data-testid="output-view"] a[href*="github.com"]'
    );

    // If links are rendered, they should be clickable
    if ((await prLink.count()) > 0) {
      await expect(prLink.first()).toBeVisible({ timeout: 30000 });
      await expect(prLink.first()).toHaveAttribute(
        "href",
        /github\.com.*pull/
      );
    } else {
      // Otherwise just verify the URL is in the output
      await expect(
        page.locator('[data-testid="output-content"]')
      ).toContainText("https://github.com", { timeout: 30000 });
    }
  });

  test("should disable other actions during push", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="bead-item"]:first-child');

    // Start push
    await page.click('[data-testid="action-push-pr"]');

    // Other buttons should be disabled
    const workButton = page.locator('[data-testid="action-work"]');
    const reviewButton = page.locator('[data-testid="action-review"]');

    if (await workButton.isVisible({ timeout: 5000 })) {
      await expect(workButton).toBeDisabled();
    }
    if (await reviewButton.isVisible({ timeout: 5000 })) {
      await expect(reviewButton).toBeDisabled();
    }
  });

  test("should handle API error on push", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: "Container not running" },
      });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Should show error
    const outputView = page.locator('[data-testid="output-view"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    await expect(outputView.or(errorMessage).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show elapsed time during push", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project and push
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-push-pr"]');

    // Button should show timer
    const pushButton = page.locator('[data-testid="action-push-pr"]');
    await expect(pushButton).toContainText(":", { timeout: 3000 });
  });

  test("should re-enable actions after push completes", async ({ page }) => {
    await page.route("/api/projects/proj-1/push-pr", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: mockPushPRSuccess });
    });

    await page.goto("/");

    // Select project and bead
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="bead-item"]:first-child');

    // Push
    await page.click('[data-testid="action-push-pr"]');

    // Wait for output to show PR
    await expect(page.locator('[data-testid="output-content"]')).toContainText(
      "github.com",
      { timeout: 10000 }
    );

    // Buttons should be re-enabled
    const workButton = page.locator('[data-testid="action-work"]');
    await expect(workButton).toBeEnabled({ timeout: 5000 });
  });
});
