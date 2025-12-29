/**
 * Unit tests for API client
 *
 * Tests the fetch wrapper and all API endpoints using MSW.
 * Uses the global MSW server from setup.ts.
 */

import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { projectApi, beadsApi, actionApi, ApiError } from "../src/api";
import { server } from "./mocks/server";

// =============================================================================
// Test suite
// Uses global server from setup.ts - no need for beforeAll/afterAll here
// =============================================================================

describe("projectApi", () => {
  describe("list", () => {
    it("should fetch all projects", async () => {
      const projects = await projectApi.list();

      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe("proj-1");
      expect(projects[0].name).toBe("test-project");
      expect(projects[0].has_beads).toBe(true);
    });

    it("should throw ApiError on server error", async () => {
      server.use(
        http.get("/api/projects", () => {
          return new HttpResponse(JSON.stringify({ error: "Server error" }), {
            status: 500,
          });
        })
      );

      await expect(projectApi.list()).rejects.toThrow(ApiError);
    });
  });

  describe("get", () => {
    it("should fetch a single project by id", async () => {
      const project = await projectApi.get("proj-1");

      expect(project.id).toBe("proj-1");
      expect(project.name).toBe("test-project");
      expect(project.path).toBe("/home/user/projects/test-project");
    });

    it("should throw ApiError for non-existent project", async () => {
      await expect(projectApi.get("nonexistent")).rejects.toThrow(ApiError);
    });

    it("should include 404 status in error", async () => {
      try {
        await projectApi.get("nonexistent");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });
  });
});

describe("beadsApi", () => {
  describe("list", () => {
    it("should fetch all beads for a project", async () => {
      const beads = await beadsApi.list("proj-1");

      expect(beads).toHaveLength(2);
      expect(beads[0].id).toBe("bead-1");
      expect(beads[0].title).toBe("Implement feature X");
      expect(beads[0].type).toBe("feature");
    });

    it("should filter beads by status", async () => {
      const beads = await beadsApi.list("proj-1", "open");

      expect(beads).toHaveLength(1);
      expect(beads[0].status).toBe("open");
    });

    it("should filter by in_progress status", async () => {
      const beads = await beadsApi.list("proj-1", "in_progress");

      expect(beads).toHaveLength(1);
      expect(beads[0].status).toBe("in_progress");
      expect(beads[0].id).toBe("bead-2");
    });

    it("should return empty array for no matches", async () => {
      const beads = await beadsApi.list("proj-1", "closed");

      expect(beads).toHaveLength(0);
    });
  });
});

describe("actionApi", () => {
  describe("work", () => {
    it("should execute work action and return result", async () => {
      const result = await actionApi.work("proj-1", "bead-1");

      expect(result.state).toBe("completed");
      expect(result.exit_code).toBe(0);
      expect(result.output).toBe("Execution completed successfully");
    });

    it("should pass context in request body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("/api/projects/:projectId/work/:beadId", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            output: "Execution completed successfully",
            state: "completed",
            exit_code: 0,
          });
        })
      );

      await actionApi.work("proj-1", "bead-1", { context: "Additional info" });

      expect(capturedBody).toEqual({ context: "Additional info" });
    });

    it("should handle blocked state", async () => {
      server.use(
        http.post("/api/projects/:projectId/work/:beadId", () => {
          return HttpResponse.json({
            output: "BLOCKED: Dependency not met",
            state: "blocked",
            exit_code: 1,
          });
        })
      );

      const result = await actionApi.work("proj-1", "bead-1");

      expect(result.state).toBe("blocked");
      expect(result.output).toContain("BLOCKED");
    });

    it("should handle failed state", async () => {
      server.use(
        http.post("/api/projects/:projectId/work/:beadId", () => {
          return HttpResponse.json({
            output: "Error occurred",
            state: "failed",
            exit_code: 1,
          });
        })
      );

      const result = await actionApi.work("proj-1", "bead-1");

      expect(result.state).toBe("failed");
    });
  });

  describe("review", () => {
    it("should execute review action", async () => {
      const result = await actionApi.review("proj-1");

      expect(result.state).toBe("completed");
      expect(result.exit_code).toBe(0);
    });

    it("should handle review failure", async () => {
      server.use(
        http.post("/api/projects/:projectId/review", () => {
          return new HttpResponse(JSON.stringify({ error: "Review failed" }), {
            status: 500,
          });
        })
      );

      await expect(actionApi.review("proj-1")).rejects.toThrow(ApiError);
    });
  });

  describe("pushPR", () => {
    it("should push and create PR", async () => {
      const result = await actionApi.pushPR("proj-1");

      expect(result.push).toBe("Everything up-to-date");
      expect(result.pr).toContain("github.com");
      expect(result.pr).toContain("/pull/42");
    });

    it("should pass title in request", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("/api/projects/:projectId/push-pr", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            push: "Everything up-to-date",
            pr: "https://github.com/user/repo/pull/42",
          });
        })
      );

      await actionApi.pushPR("proj-1", { title: "My PR Title" });

      expect(capturedBody).toEqual({ title: "My PR Title" });
    });
  });

  describe("getProgress", () => {
    it("should fetch progress info", async () => {
      const progress = await actionApi.getProgress("proj-1");

      expect(progress.running).toBe(true);
      expect(progress.bytes).toBe(2048);
      expect(progress.recent).toBe("Current step...");
    });

    it("should handle not running state", async () => {
      server.use(
        http.get("/api/projects/:projectId/progress", () => {
          return HttpResponse.json({
            running: false,
            output: "",
            recent: "",
            bytes: 0,
          });
        })
      );

      const progress = await actionApi.getProgress("proj-1");

      expect(progress.running).toBe(false);
    });
  });

  describe("getAttachInfo", () => {
    it("should fetch container attach info", async () => {
      const info = await actionApi.getAttachInfo("proj-1");

      expect(info.container_id).toBe("abc123def456");
      expect(info.command).toContain("docker exec");
    });

    it("should handle no container running", async () => {
      server.use(
        http.get("/api/projects/:projectId/attach", () => {
          return new HttpResponse(
            JSON.stringify({ error: "Container not running" }),
            { status: 404 }
          );
        })
      );

      await expect(actionApi.getAttachInfo("proj-1")).rejects.toThrow(ApiError);
    });
  });
});

describe("ApiError", () => {
  it("should contain status and message", async () => {
    server.use(
      http.get("/api/projects", () => {
        return new HttpResponse(JSON.stringify({ error: "Bad request" }), {
          status: 400,
        });
      })
    );

    try {
      await projectApi.list();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.message).toContain("Bad request");
      expect(apiError.name).toBe("ApiError");
    }
  });
});
