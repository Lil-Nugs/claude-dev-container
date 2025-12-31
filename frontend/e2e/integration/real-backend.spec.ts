import { test, expect } from "@playwright/test";

/**
 * Integration tests that run against the REAL backend (not mocked).
 *
 * These tests verify the actual frontend-to-backend communication works.
 * They are skipped in CI since CI does not run the backend.
 *
 * Prerequisites:
 * 1. Backend running: cd backend && source .venv/bin/activate && python3 -m uvicorn app.main:app --port 8000
 * 2. Frontend running: cd frontend && npm run dev
 * 3. At least one project in the workspace with .beads initialized
 *
 * Usage:
 *   cd frontend && npx playwright test e2e/integration/real-backend.spec.ts
 */

// Skip in CI - these tests require a real backend
test.skip(() => !!process.env.CI, "Skipped in CI - requires real backend");

test.describe("Real Backend Integration", () => {
  test.beforeAll(async ({ request }) => {
    // Verify backend is reachable before running tests
    try {
      const response = await request.get("http://localhost:8000/health");
      if (!response.ok()) {
        test.skip(true, "Backend not running - start it with: cd backend && python3 -m uvicorn app.main:app --port 8000");
      }
    } catch {
      test.skip(true, "Backend not reachable at localhost:8000");
    }
  });

  test("should load real projects from backend API", async ({ page }) => {
    await page.goto("/");

    // Wait for project list to appear (real API call, not mocked)
    const projectList = page.locator('[data-testid="project-list"]');
    await expect(projectList).toBeVisible({ timeout: 15000 });

    // Should have at least one project from the real workspace
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).not.toHaveCount(0, { timeout: 10000 });
  });

  test("should load beads after selecting a project with beads", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for project list
    const projectList = page.locator('[data-testid="project-list"]');
    await expect(projectList).toBeVisible({ timeout: 15000 });

    // Click first project card
    await page.locator('[data-testid="project-card"]').first().click();

    // Wait for either bead list or empty beads message
    // (depends on whether the project has beads initialized)
    const beadList = page.locator('[data-testid="bead-list"]');
    const emptyBeads = page.locator('[data-testid="empty-beads"]');

    await expect(beadList.or(emptyBeads)).toBeVisible({ timeout: 10000 });
  });

  test("should display project information from real API", async ({ page }) => {
    await page.goto("/");

    // Wait for project list
    const projectList = page.locator('[data-testid="project-list"]');
    await expect(projectList).toBeVisible({ timeout: 15000 });

    // First project should have a name (not just loading skeleton)
    const firstProject = page.locator('[data-testid="project-card"]').first();
    await expect(firstProject).toBeVisible();

    // Get the text content - should have actual project name
    const text = await firstProject.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("should handle real API health check", async ({ request }) => {
    // Direct API call to verify backend health endpoint
    const response = await request.get("http://localhost:8000/health");
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("healthy");
  });

  test("should receive real projects from API", async ({ request }) => {
    // Direct API call to verify projects endpoint
    const response = await request.get("http://localhost:8000/api/projects");
    expect(response.ok()).toBe(true);

    const projects = await response.json();
    expect(Array.isArray(projects)).toBe(true);

    // Each project should have required fields
    if (projects.length > 0) {
      const project = projects[0];
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("path");
      expect(project).toHaveProperty("has_beads");
    }
  });
});
