import { test, expect } from "@playwright/test";

/**
 * Smoke tests for basic application loading.
 * These tests verify the application starts and renders correctly.
 */

test.describe("Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API to prevent proxy errors - smoke tests don't need real API data
    await page.route("/api/**", async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test("should load the application", async ({ page }) => {
    await page.goto("/");

    // Application should load without errors
    await expect(page).toHaveTitle(/DevContainer/i, { timeout: 10000 });
  });

  test("should display the header", async ({ page }) => {
    await page.goto("/");

    // Header should be visible with app name
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header).toContainText("DevContainer");
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");

    // App should still be usable on mobile
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("should not have console errors on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(1000);

    // Filter out expected errors (like missing API endpoints in dev)
    const unexpectedErrors = errors.filter(
      (err) =>
        !err.includes("Failed to fetch") &&
        !err.includes("net::ERR") &&
        !err.includes("404")
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  test("should have proper meta viewport for mobile", async ({ page }) => {
    await page.goto("/");

    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
  });
});
