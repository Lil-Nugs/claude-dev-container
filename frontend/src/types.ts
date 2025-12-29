// Execution states
export type ExecutionState = "completed" | "blocked" | "failed" | "cancelled";

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
  status: "open" | "in_progress" | "closed";
  description?: string;
  priority: number;
  type: "task" | "bug" | "feature" | "epic";
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
