import type {
  Project,
  Bead,
  ExecutionResult,
  ProgressInfo,
  AttachInfo,
  WorkRequest,
  PushPRRequest,
  PushPRResponse,
} from "./types";

const API_BASE = "/api";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json() as Promise<T>;
}

/**
 * Project API endpoints
 * Matches SIMPLIFIED_PLAN.md specification
 */
export const projectApi = {
  /** GET /api/projects - List projects in ~/projects/ */
  list: (): Promise<Project[]> => fetchApi<Project[]>("/projects"),

  /** GET /api/projects/{id} - Project details + container status */
  get: (projectId: string): Promise<Project> =>
    fetchApi<Project>(`/projects/${projectId}`),
};

/**
 * Beads API endpoints
 */
export const beadsApi = {
  /** GET /api/projects/{id}/beads - List beads (calls bd list) */
  list: (projectId: string, status?: string): Promise<Bead[]> => {
    const params = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchApi<Bead[]>(`/projects/${projectId}/beads${params}`);
  },
};

/**
 * Action API endpoints
 * These are the core actions from SIMPLIFIED_PLAN.md
 */
export const actionApi = {
  /** POST /api/projects/{id}/work/{bead_id} - Run Claude on bead */
  work: (
    projectId: string,
    beadId: string,
    request?: WorkRequest
  ): Promise<ExecutionResult> =>
    fetchApi<ExecutionResult>(`/projects/${projectId}/work/${beadId}`, {
      method: "POST",
      body: JSON.stringify(request ?? {}),
    }),

  /** POST /api/projects/{id}/review - Run Claude review */
  review: (projectId: string): Promise<ExecutionResult> =>
    fetchApi<ExecutionResult>(`/projects/${projectId}/review`, {
      method: "POST",
    }),

  /** POST /api/projects/{id}/push-pr - Git push + gh pr create */
  pushPR: (projectId: string, request?: PushPRRequest): Promise<PushPRResponse> =>
    fetchApi<PushPRResponse>(`/projects/${projectId}/push-pr`, {
      method: "POST",
      body: JSON.stringify(request ?? {}),
    }),

  /** GET /api/projects/{id}/progress - Get current execution progress */
  getProgress: (projectId: string): Promise<ProgressInfo> =>
    fetchApi<ProgressInfo>(`/projects/${projectId}/progress`),

  /** GET /api/projects/{id}/attach - Get container ID for docker exec */
  getAttachInfo: (projectId: string): Promise<AttachInfo> =>
    fetchApi<AttachInfo>(`/projects/${projectId}/attach`),
};
