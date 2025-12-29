// Execution states
export type ExecutionState = "completed" | "blocked" | "failed" | "cancelled";

// Bead status
export type BeadStatus = "open" | "in_progress" | "closed";

// Bead type
export type BeadType = "task" | "bug" | "feature" | "epic";

// API Response types
export interface Project {
  id: string;
  name: string;
  path: string;
  has_beads: boolean;
}

export interface Bead {
  id: string;
  title: string;
  status: BeadStatus;
  description?: string;
  priority: number;
  type: BeadType;
}

export interface ExecutionResult {
  output: string;
  state: ExecutionState;
  exit_code: number;
}

export interface ProgressInfo {
  running: boolean;
  output: string;
  recent: string;
  bytes: number;
}

export interface AttachInfo {
  container_id: string;
  command: string;
}

// Request types
export interface WorkRequest {
  context?: string;
}

export interface PushPRRequest {
  title?: string;
}

// Response types for actions
export interface PushPRResponse {
  push: string;
  pr: string;
}
