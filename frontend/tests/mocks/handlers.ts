import { http, HttpResponse } from "msw";
import type {
  Project,
  Bead,
  ExecutionResult,
  ProgressInfo,
  AttachInfo,
  PushPRResponse,
} from "../../src/types";

// Mock data
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

const mockBeads: Record<string, Bead[]> = {
  "proj-1": [
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
  ],
};

const mockExecutionResult: ExecutionResult = {
  output: "Execution completed successfully",
  state: "completed",
  exit_code: 0,
};

const mockProgressInfo: ProgressInfo = {
  running: true,
  output: "Working on task...",
  recent: "Current step...",
  bytes: 2048,
};

const mockAttachInfo: AttachInfo = {
  container_id: "abc123def456",
  command: "docker exec -it abc123def456 /bin/bash",
};

const mockPushPRResponse: PushPRResponse = {
  branch: "feature-branch",
  push_output: "Everything up-to-date",
  pr_output: "Creating pull request for feature-branch",
  pr_url: "https://github.com/user/repo/pull/42",
};

// Request handlers matching SIMPLIFIED_PLAN.md API structure
export const handlers = [
  // =============================================================================
  // Project Endpoints
  // =============================================================================

  // GET /api/projects - List projects
  http.get("/api/projects", () => {
    return HttpResponse.json(mockProjects);
  }),

  // GET /api/projects/:projectId - Get project details
  http.get("/api/projects/:projectId", ({ params }) => {
    const project = mockProjects.find((p) => p.id === params["projectId"]);
    if (!project) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  // =============================================================================
  // Beads Endpoints
  // =============================================================================

  // GET /api/projects/:projectId/beads - List beads
  http.get("/api/projects/:projectId/beads", ({ params, request }) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");
    const projectId = params["projectId"] as string;

    let beads = mockBeads[projectId] ?? [];

    if (statusFilter) {
      beads = beads.filter((b) => b.status === statusFilter);
    }

    return HttpResponse.json(beads);
  }),

  // =============================================================================
  // Action Endpoints
  // =============================================================================

  // POST /api/projects/:projectId/work/:beadId - Run Claude on bead
  http.post("/api/projects/:projectId/work/:beadId", () => {
    return HttpResponse.json(mockExecutionResult);
  }),

  // POST /api/projects/:projectId/review - Run Claude review
  http.post("/api/projects/:projectId/review", () => {
    return HttpResponse.json(mockExecutionResult);
  }),

  // POST /api/projects/:projectId/push-pr - Git push + gh pr create
  http.post("/api/projects/:projectId/push-pr", () => {
    return HttpResponse.json(mockPushPRResponse);
  }),

  // GET /api/projects/:projectId/progress - Get execution progress
  http.get("/api/projects/:projectId/progress", () => {
    return HttpResponse.json(mockProgressInfo);
  }),

  // GET /api/projects/:projectId/attach - Get container attach info
  http.get("/api/projects/:projectId/attach", () => {
    return HttpResponse.json(mockAttachInfo);
  }),
];
