import type {
  Project,
  Bead,
  ExecutionResult,
  ProgressInfo,
  AttachInfo,
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
 */
export const projectApi = {
  list: (): Promise<Project[]> => fetchApi<Project[]>("/projects"),

  get: (id: string): Promise<Project> => fetchApi<Project>(`/projects/${id}`),

  scan: (path: string): Promise<Project> =>
    fetchApi<Project>("/projects/scan", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
};

/**
 * Beads API endpoints
 */
export const beadsApi = {
  list: (projectId: string): Promise<Bead[]> =>
    fetchApi<Bead[]>(`/projects/${projectId}/beads`),

  get: (projectId: string, beadId: string): Promise<Bead> =>
    fetchApi<Bead>(`/projects/${projectId}/beads/${beadId}`),

  ready: (projectId: string): Promise<Bead[]> =>
    fetchApi<Bead[]>(`/projects/${projectId}/beads/ready`),
};

/**
 * Execution API endpoints
 */
export const executionApi = {
  run: (
    projectId: string,
    command: string
  ): Promise<{ execution_id: string }> =>
    fetchApi<{ execution_id: string }>(`/projects/${projectId}/execute`, {
      method: "POST",
      body: JSON.stringify({ command }),
    }),

  progress: (executionId: string): Promise<ProgressInfo> =>
    fetchApi<ProgressInfo>(`/executions/${executionId}/progress`),

  result: (executionId: string): Promise<ExecutionResult> =>
    fetchApi<ExecutionResult>(`/executions/${executionId}/result`),

  cancel: (executionId: string): Promise<void> =>
    fetchApi<void>(`/executions/${executionId}/cancel`, {
      method: "POST",
    }),

  attach: (executionId: string): Promise<AttachInfo> =>
    fetchApi<AttachInfo>(`/executions/${executionId}/attach`),
};
