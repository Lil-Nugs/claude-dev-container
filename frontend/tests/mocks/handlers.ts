import { http, HttpResponse } from "msw";
import type { Project, Bead, ExecutionResult, ProgressInfo } from "../../src/types";

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
  output: "Command executed successfully",
  state: "completed",
  exit_code: 0,
};

const mockProgressInfo: ProgressInfo = {
  running: false,
  output: "Output text here",
  recent: "Recent output",
  bytes: 1024,
};

// Request handlers
export const handlers = [
  // Projects
  http.get("/api/projects", () => {
    return HttpResponse.json(mockProjects);
  }),

  http.get("/api/projects/:id", ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id);
    if (!project) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  http.post("/api/projects/scan", async ({ request }) => {
    const body = (await request.json()) as { path: string };
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: body.path.split("/").pop() ?? "unknown",
      path: body.path,
      has_beads: false,
    };
    return HttpResponse.json(newProject);
  }),

  // Beads
  http.get("/api/projects/:projectId/beads", ({ params }) => {
    const beads = mockBeads[params.projectId as string] ?? [];
    return HttpResponse.json(beads);
  }),

  http.get("/api/projects/:projectId/beads/:beadId", ({ params }) => {
    const projectBeads = mockBeads[params.projectId as string] ?? [];
    const bead = projectBeads.find((b) => b.id === params.beadId);
    if (!bead) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(bead);
  }),

  http.get("/api/projects/:projectId/beads/ready", ({ params }) => {
    const projectBeads = mockBeads[params.projectId as string] ?? [];
    const readyBeads = projectBeads.filter((b) => b.status === "open");
    return HttpResponse.json(readyBeads);
  }),

  // Executions
  http.post("/api/projects/:projectId/execute", () => {
    return HttpResponse.json({ execution_id: `exec-${Date.now()}` });
  }),

  http.get("/api/executions/:executionId/progress", () => {
    return HttpResponse.json(mockProgressInfo);
  }),

  http.get("/api/executions/:executionId/result", () => {
    return HttpResponse.json(mockExecutionResult);
  }),

  http.post("/api/executions/:executionId/cancel", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/executions/:executionId/attach", () => {
    return HttpResponse.json({
      container_id: "container-123",
      command: "docker exec -it container-123 /bin/bash",
    });
  }),
];
