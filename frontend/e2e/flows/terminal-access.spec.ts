import { test, expect } from "@playwright/test";

/**
 * E2E tests for terminal access flow.
 * Tests the terminal modal with docker exec command display.
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
    description: "Add the new feature X",
    priority: 1,
    type: "feature",
  },
];

const mockAttachInfo = {
  container_id: "abc123def456789012345678901234567890",
  command: "docker exec -it abc123def456 /bin/bash",
};

test.describe("Terminal Access", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/projects", async (route) => {
      await route.fulfill({ json: mockProjects });
    });

    await page.route("/api/projects/proj-1/beads*", async (route) => {
      await route.fulfill({ json: mockBeads });
    });

    await page.route("/api/projects/proj-1/attach", async (route) => {
      await route.fulfill({ json: mockAttachInfo });
    });

    // Catch-all for any unmocked API requests (must be last)
    await page.route("/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should show terminal modal with command", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project
    await page.click('[data-testid="project-card"]:first-child');

    // Click terminal button
    await page.click('[data-testid="action-terminal"]');

    // Modal should be visible
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible({
      timeout: 5000,
    });

    // Should show docker exec command
    await expect(page.locator('[data-testid="terminal-command"]')).toContainText(
      "docker exec"
    );
  });

  test("should display container ID", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Should show truncated container ID
    await expect(page.locator('[data-testid="container-id"]')).toContainText(
      "abc123def456"
    );
  });

  test("should copy command to clipboard", async ({ page, context }) => {
    // Skip in CI - clipboard permissions don't work reliably in headless mode
    test.skip(!!process.env.CI, "Clipboard not available in headless CI");

    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Wait for modal
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    // Click copy button
    await page.click('[data-testid="copy-command"]');

    // Button should show success state
    const copyButton = page.locator('[data-testid="copy-command"]');
    await expect(copyButton).toContainText("Copied", { timeout: 2000 });
  });

  test("should close terminal modal via close button", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Modal should be visible
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    // Click close button
    await page.click('[data-testid="terminal-close"]');

    // Modal should be hidden
    await expect(
      page.locator('[data-testid="terminal-modal"]')
    ).not.toBeVisible();
  });

  test("should close terminal modal via backdrop click", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Modal should be visible
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    // Click backdrop
    await page.click('[data-testid="terminal-backdrop"]');

    // Modal should be hidden
    await expect(
      page.locator('[data-testid="terminal-modal"]')
    ).not.toBeVisible();
  });

  test("should close terminal modal via escape key", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Modal should be visible
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    // Press escape
    await page.keyboard.press("Escape");

    // Modal should be hidden
    await expect(
      page.locator('[data-testid="terminal-modal"]')
    ).not.toBeVisible();
  });

  test("should show loading state while fetching attach info", async ({
    page,
  }) => {
    // Delay the response
    await page.route("/api/projects/proj-1/attach", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ json: mockAttachInfo });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Should show loading state
    await expect(page.locator('[data-testid="terminal-loading"]')).toBeVisible();

    // Eventually shows command
    await expect(page.locator('[data-testid="terminal-command"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show error when container not running", async ({ page }) => {
    await page.route("/api/projects/proj-1/attach", async (route) => {
      await route.fulfill({
        status: 404,
        json: { error: "Container not running" },
      });
    });

    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Should show error state
    await expect(page.locator('[data-testid="terminal-error"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('[data-testid="terminal-error"]')).toContainText(
      "not available"
    );
  });

  test("should have touch-friendly button sizes", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to load
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();

    // Select project and open terminal
    await page.click('[data-testid="project-card"]:first-child');
    await page.click('[data-testid="action-terminal"]');

    // Wait for modal
    await expect(page.locator('[data-testid="terminal-modal"]')).toBeVisible();

    // Close button should be at least 44px for touch
    const closeButton = page.locator('[data-testid="terminal-close"]');
    const box = await closeButton.boundingBox();

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});
