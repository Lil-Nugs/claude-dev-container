# Frontend Implementation Plan (Full Orchestration)

> **Note**: This is the **full orchestration** frontend plan. For MVP, see **SIMPLIFIED_PLAN.md**.
> Use this document as reference when adding Tier 2/3 features from FUTURE_ENHANCEMENTS.md.

**Stack**: React + TypeScript + Vite + Tailwind CSS + Zustand
**Status**: Reference document (Future)

---

## File Structure

```
frontend/
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Main app component
│   ├── vite-env.d.ts               # Vite types
│   ├── api/
│   │   ├── client.ts                # Axios API client
│   │   └── types.ts                 # API response types
│   ├── components/
│   │   ├── ProjectList.tsx          # Project grid/list
│   │   ├── ProjectCard.tsx          # Individual project card
│   │   ├── ProjectDetail.tsx        # Project detail view with beads
│   │   ├── BeadList.tsx             # List of beads
│   │   ├── BeadCard.tsx             # Individual bead card
│   │   ├── BeadExecutionModal.tsx   # Start execution dialog
│   │   ├── ExecutionStatus.tsx      # Real-time execution display
│   │   ├── ReviewPanel.tsx          # Review interface
│   │   ├── PRDialog.tsx             # Create PR dialog
│   │   └── ContainerStatus.tsx      # Container health indicator
│   ├── hooks/
│   │   ├── usePolling.ts            # Generic polling hook
│   │   ├── useProjects.ts           # Project data hook
│   │   ├── useBeads.ts              # Beads data hook
│   │   └── useExecution.ts          # Execution state hook
│   ├── store/
│   │   ├── projectStore.ts          # Zustand project state
│   │   ├── executionStore.ts        # Zustand execution state
│   │   └── uiStore.ts               # UI state (modals, etc.)
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   └── utils/
│       ├── formatters.ts            # Date, duration formatting
│       └── validators.ts            # Input validation
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── service-worker.js            # Service worker
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── index.html
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts                   # Vite + PWA config
```

---

## Core Files

### 1. `src/types/index.ts` - TypeScript Types

```typescript
// Execution types
export enum ExecutionState {
  QUEUED = "queued",
  RUNNING = "running",
  WAITING_INPUT = "waiting_input",
  COMPLETED = "completed",
  FAILED = "failed",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

export interface ExecutionStatus {
  id: string;
  state: ExecutionState;
  bead_id: string;
  branch_name?: string;
  output: string[];
  progress_percent: number;
  elapsed_seconds: number;
  timeout_seconds: number;
  error?: string;
  questions: string[];
}

// Project types
export interface Project {
  id: string;
  name: string;
  path: string;
  has_beads: boolean;
  container_id?: string;
  container_status?: string;
  last_commit?: string;
  branch: string;
}

// Bead types
export interface Bead {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  type: string;
  created_at: string;
  updated_at: string;
  assignee?: string;
  blocked_by: string[];
  blocks: string[];
}

// Review types
export interface ReviewStatus {
  id: string;
  state: string;
  beads_reviewed: string[];
  issues_found: number;
  new_beads_created: string[];
  output: string;
}

// PR types
export interface PRResponse {
  pr_url: string;
  pr_number: number;
  beads_included: string[];
}
```

### 2. `src/api/client.ts` - API Client

```typescript
import axios, { AxiosInstance } from "axios";
import type {
  Project,
  Bead,
  ExecutionStatus,
  ReviewStatus,
  PRResponse,
} from "@/types";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    // Auto-detect API URL (Tailscale IP or localhost)
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("API Error:", error);
        throw error;
      }
    );
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    const { data } = await this.client.get("/projects");
    return data;
  }

  async getProject(id: string): Promise<Project> {
    const { data } = await this.client.get(`/projects/${id}`);
    return data;
  }

  async ensureContainer(projectId: string): Promise<void> {
    await this.client.post(`/projects/${projectId}/ensure-container`);
  }

  async refreshContainer(projectId: string): Promise<void> {
    await this.client.post(`/projects/${projectId}/container/refresh`);
  }

  // Beads
  async getBeads(projectId: string, status?: string): Promise<Bead[]> {
    const params = status ? { status } : {};
    const { data } = await this.client.get(`/projects/${projectId}/beads`, { params });
    return data;
  }

  async getBead(projectId: string, beadId: string): Promise<Bead> {
    const { data } = await this.client.get(`/projects/${projectId}/beads/${beadId}`);
    return data;
  }

  async updateBead(
    projectId: string,
    beadId: string,
    updates: Partial<Bead>
  ): Promise<void> {
    await this.client.patch(`/projects/${projectId}/beads/${beadId}`, updates);
  }

  // Execution
  async startExecution(
    projectId: string,
    beadId: string,
    context?: string,
    timeout?: number
  ): Promise<{ execution_id: string }> {
    const { data } = await this.client.post(
      `/projects/${projectId}/beads/${beadId}/execute`,
      { context, timeout }
    );
    return data;
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const { data } = await this.client.get(`/executions/${executionId}/status`);
    return data;
  }

  async cancelExecution(executionId: string): Promise<void> {
    await this.client.post(`/executions/${executionId}/cancel`);
  }

  async provideInput(executionId: string, input: string): Promise<void> {
    await this.client.post(`/executions/${executionId}/input`, { input });
  }

  // Review
  async startReview(
    projectId: string,
    beadIds: string[]
  ): Promise<{ review_id: string }> {
    const { data } = await this.client.post(`/projects/${projectId}/review`, {
      beads: beadIds,
    });
    return data;
  }

  async getReviewStatus(reviewId: string): Promise<ReviewStatus> {
    const { data } = await this.client.get(`/reviews/${reviewId}/status`);
    return data;
  }

  // PR
  async createPR(
    projectId: string,
    beadIds: string[],
    title?: string,
    autoReview: boolean = true
  ): Promise<PRResponse> {
    const { data } = await this.client.post(`/projects/${projectId}/pr`, {
      beads: beadIds,
      title,
      auto_review: autoReview,
    });
    return data;
  }
}

export const api = new APIClient();
```

### 3. `src/hooks/usePolling.ts` - Polling Hook

```typescript
import { useEffect, useState, useRef } from "react";

interface PollingOptions {
  interval?: number; // ms
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  isComplete: (data: T) => boolean,
  options: PollingOptions = {}
) {
  const {
    interval = 5000,
    enabled = true,
    onComplete,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const result = await fetchFn();
        setData(result);
        setError(null);

        if (isComplete(result)) {
          setIsPolling(false);
          onComplete?.();
        } else {
          // Schedule next poll
          timerRef.current = window.setTimeout(poll, interval);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        // Continue polling on error
        timerRef.current = window.setTimeout(poll, interval);
      }
    };

    // Start polling
    poll();

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, interval]);

  return { data, error, isPolling };
}
```

### 4. `src/store/executionStore.ts` - Execution State

```typescript
import { create } from "zustand";
import type { ExecutionStatus } from "@/types";

interface ExecutionStore {
  executions: Map<string, ExecutionStatus>;
  activeExecutionId: string | null;

  setExecution: (id: string, status: ExecutionStatus) => void;
  updateExecution: (id: string, updates: Partial<ExecutionStatus>) => void;
  removeExecution: (id: string) => void;
  setActiveExecution: (id: string | null) => void;
  getExecution: (id: string) => ExecutionStatus | undefined;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  executions: new Map(),
  activeExecutionId: null,

  setExecution: (id, status) =>
    set((state) => {
      const executions = new Map(state.executions);
      executions.set(id, status);
      return { executions };
    }),

  updateExecution: (id, updates) =>
    set((state) => {
      const executions = new Map(state.executions);
      const current = executions.get(id);
      if (current) {
        executions.set(id, { ...current, ...updates });
      }
      return { executions };
    }),

  removeExecution: (id) =>
    set((state) => {
      const executions = new Map(state.executions);
      executions.delete(id);
      return {
        executions,
        activeExecutionId: state.activeExecutionId === id ? null : state.activeExecutionId,
      };
    }),

  setActiveExecution: (id) => set({ activeExecutionId: id }),

  getExecution: (id) => get().executions.get(id),
}));
```

### 5. `src/components/ExecutionStatus.tsx` - Real-time Execution Display

```typescript
import { useEffect } from "react";
import { api } from "@/api/client";
import { usePolling } from "@/hooks/usePolling";
import { useExecutionStore } from "@/store/executionStore";
import { ExecutionState } from "@/types";

interface Props {
  executionId: string;
  onComplete?: () => void;
}

export function ExecutionStatus({ executionId, onComplete }: Props) {
  const updateExecution = useExecutionStore((s) => s.updateExecution);
  const execution = useExecutionStore((s) => s.getExecution(executionId));

  // Poll for status
  const { data, isPolling } = usePolling(
    () => api.getExecutionStatus(executionId),
    (status) =>
      status.state === ExecutionState.COMPLETED ||
      status.state === ExecutionState.FAILED ||
      status.state === ExecutionState.TIMEOUT,
    {
      interval: 5000,
      onComplete,
    }
  );

  // Update store
  useEffect(() => {
    if (data) {
      updateExecution(executionId, data);
    }
  }, [data, executionId, updateExecution]);

  if (!execution) {
    return <div>Loading...</div>;
  }

  const isActive = isPolling && execution.state === ExecutionState.RUNNING;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Execution Status</h3>
        <StatusBadge state={execution.state} />
      </div>

      {/* Progress */}
      {isActive && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{execution.progress_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${execution.progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Time */}
      <div className="text-sm text-gray-600">
        <div>Elapsed: {formatDuration(execution.elapsed_seconds)}</div>
        <div>
          Timeout: {formatDuration(execution.timeout_seconds - execution.elapsed_seconds)} remaining
        </div>
      </div>

      {/* Output */}
      <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
        {execution.output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {isActive && <div className="animate-pulse">▊</div>}
      </div>

      {/* Questions (if waiting for input) */}
      {execution.questions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h4 className="font-semibold mb-2">Agent has questions:</h4>
          {execution.questions.map((q, i) => (
            <div key={i} className="mb-2">
              <p>{q}</p>
              {/* TODO: Input field for response */}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {execution.error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded text-red-800">
          <strong>Error:</strong> {execution.error}
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <button
          onClick={() => api.cancelExecution(executionId)}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: ExecutionState }) {
  const colors = {
    [ExecutionState.QUEUED]: "bg-gray-200 text-gray-800",
    [ExecutionState.RUNNING]: "bg-blue-500 text-white animate-pulse",
    [ExecutionState.WAITING_INPUT]: "bg-yellow-500 text-white",
    [ExecutionState.COMPLETED]: "bg-green-500 text-white",
    [ExecutionState.FAILED]: "bg-red-500 text-white",
    [ExecutionState.TIMEOUT]: "bg-orange-500 text-white",
    [ExecutionState.CANCELLED]: "bg-gray-500 text-white",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm ${colors[state]}`}>
      {state}
    </span>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
```

### 6. `src/components/BeadCard.tsx` - Bead Display

```typescript
import type { Bead } from "@/types";

interface Props {
  bead: Bead;
  onExecute: (bead: Bead) => void;
}

export function BeadCard({ bead, onExecute }: Props) {
  const priorityColors = {
    0: "border-red-500 bg-red-50",
    1: "border-orange-500 bg-orange-50",
    2: "border-yellow-500 bg-yellow-50",
    3: "border-blue-500 bg-blue-50",
    4: "border-gray-500 bg-gray-50",
  };

  const statusColors = {
    open: "bg-gray-200",
    in_progress: "bg-blue-500 text-white",
    done: "bg-green-500 text-white",
    blocked: "bg-red-500 text-white",
  };

  return (
    <div className={`border-l-4 p-4 rounded ${priorityColors[bead.priority as keyof typeof priorityColors]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">{bead.id}</span>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[bead.status as keyof typeof statusColors]}`}>
              {bead.status}
            </span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              {bead.type}
            </span>
          </div>
          <h3 className="font-semibold">{bead.title}</h3>
        </div>
        <span className="text-sm font-bold text-gray-600">P{bead.priority}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3">{bead.description}</p>

      {/* Blockers */}
      {bead.blocked_by.length > 0 && (
        <div className="text-xs text-red-600 mb-2">
          🚫 Blocked by: {bead.blocked_by.join(", ")}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {new Date(bead.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={() => onExecute(bead)}
          disabled={bead.status === "done" || bead.blocked_by.length > 0}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Execute
        </button>
      </div>
    </div>
  );
}
```

---

## PWA Configuration

### 7. `vite.config.ts` - Vite + PWA

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Claude Dev Container",
        short_name: "DevContainer",
        description: "Manage software projects with Claude",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tailscale\.net\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    host: "0.0.0.0", // Listen on all interfaces for Tailscale
    port: 5173,
  },
});
```

---

## Dependencies (`package.json`)

```json
{
  "name": "claude-dev-container-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.2",
    "vite": "^5.0.4",
    "vite-plugin-pwa": "^0.17.4"
  }
}
```

---

## Implementation Priority

### Phase 1: Basic UI
1. ✅ TypeScript types
2. ✅ API client
3. ✅ Project list component
4. ✅ Bead list component

### Phase 2: Execution
5. ✅ Polling hook
6. ✅ Execution store
7. ✅ Execution status component

### Phase 3: Polish
8. ✅ Review panel
9. ✅ PR dialog
10. ✅ PWA configuration

---

## Next: See CONTAINER_PLAN.md for Docker setup
