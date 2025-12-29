# Implementation Gaps

This document captures gaps between documentation and implementation readiness. These must be resolved before or during implementation.

## Quick Reference

| Gap Area | Status | Blocking? | Resolution |
|----------|--------|-----------|------------|
| TypeScript Types | ~70% specified | Partially | Complete missing types during implementation |
| State Management | Decided | No | MVP uses local state, Zustand deferred |
| MSW Handlers | ~12% specified | Yes | Expand handler coverage before component tests |
| Terminal Embed | Decided | No | MVP: command display modal; Future: ttyd |
| Loading/Error States | Specified | No | Skeleton, error, empty components ready |
| PWA Terminal Access | Specified | No | Modal-based approach works cross-platform |
| PWA Manifest | Specified | No | Complete config in Section 7 |
| Service Worker Caching | Specified | No | CacheFirst for assets, NetworkFirst for API |
| Responsive Breakpoints | Specified | No | Default Tailwind (sm/md/lg/xl) in Section 9 |
| Offline Behavior | Specified | No | Show cached data, disable actions |
| E2E Test Scenarios | Specified | No | 10-12 comprehensive tests in TESTING_GUIDE.md |

---

## 1. TypeScript Types

### Status: Partially Specified

Core domain types are documented in `FRONTEND_PLAN.md` and `SIMPLIFIED_PLAN.md`. Some gaps need resolution during implementation.

### What Exists (Ready to Use)

```typescript
// From FRONTEND_PLAN.md - copy directly to types.ts

enum ExecutionState {
  QUEUED = "queued",
  RUNNING = "running",
  WAITING_INPUT = "waiting_input",
  COMPLETED = "completed",
  FAILED = "failed",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

interface ExecutionStatus {
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

interface Project {
  id: string;
  name: string;
  path: string;
  has_beads: boolean;
  container_id?: string;
  container_status?: string;
  last_commit?: string;
  branch: string;
}

interface Bead {
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
```

### What's Missing (Add During Implementation)

#### 1.1 String Literal Types for Bead Fields

The `Bead` interface uses `string` where union types should be used:

```typescript
// ADD THESE - replace string fields with union types
type BeadStatus = 'pending' | 'open' | 'in_progress' | 'completed' | 'blocked' | 'waiting_review';
type BeadType = 'feature' | 'bug' | 'docs' | 'chore' | 'test' | 'task';
type ContainerStatus = 'running' | 'stopped' | 'error' | 'starting' | 'unknown';

// Then update Bead interface:
interface Bead {
  // ...existing fields...
  status: BeadStatus;  // was: string
  type: BeadType;      // was: string
}

// Update Project interface:
interface Project {
  // ...existing fields...
  container_status?: ContainerStatus;  // was: string
}
```

#### 1.2 API Error Handling Types

No error types are defined. Add these:

```typescript
// API error class for catch blocks
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error response shape from backend
interface ApiErrorResponse {
  error: string;
  detail?: string;
  code?: string;
}
```

#### 1.3 Request DTO Types

API request bodies are not typed. Add these based on `SIMPLIFIED_PLAN.md`:

```typescript
// POST /api/projects/{id}/work/{bead_id}
interface WorkRequest {
  context?: string;
}

// POST /api/projects/{id}/push-pr
interface PushPRRequest {
  title?: string;
}

// Response wrapper for consistency
interface ExecutionResult {
  output: string;
  state: ExecutionState;
  exit_code: number;
}

interface ProgressResponse {
  running: boolean;
  output: string;
  recent: string;
  bytes: number;
}

interface PRResponse {
  push: string;
  pr: string;
}
```

#### 1.4 Hook Return Types

Standardize hook return shapes:

```typescript
// Generic pattern for data-fetching hooks
interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Specific implementations
type UseProjectsResult = UseQueryResult<Project[]>;
type UseBeadsResult = UseQueryResult<Bead[]>;
type UseExecutionResult = UseQueryResult<ExecutionStatus>;
```

### Implementation Checklist

When implementing `frontend/src/types.ts`:

- [ ] Copy existing types from FRONTEND_PLAN.md
- [ ] Add BeadStatus, BeadType, ContainerStatus union types
- [ ] Update Bead and Project interfaces to use union types
- [ ] Add ApiError class
- [ ] Add request/response DTO types
- [ ] Add hook return type patterns
- [ ] Export all types

---

## 2. State Management

### Status: Decided (No Gaps)

State management approach is fully decided. This section documents decisions for implementation clarity.

### MVP Approach (What to Implement)

**Use local component state only.** No global state library needed.

```typescript
// Pattern 1: Component state with useState
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Project[]>([]);

// Pattern 2: Custom hooks for data fetching
function useProjects(): UseProjectsResult {
  const [data, setData] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const projects = await api.listProjects();
      setData(projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

// Pattern 3: Props + callbacks for parent-child communication
interface ActionBarProps {
  projectId: string;
  selectedBead: Bead | null;
  onOutput: (output: string) => void;
}
```

### Why No Zustand in MVP

- Single active execution at a time
- User watches output directly (no background state)
- Props + callbacks sufficient for current component tree depth
- Zustand is available for Tier 2 features if needed

### Deferred Decisions (For Future Reference)

These decisions can wait until implementing Tier 2/3 features:

1. **When to upgrade to Zustand**: When component nesting causes prop drilling pain
2. **Persistent state**: localStorage for user preferences (theme, selected project)
3. **Cache strategy**: How long to cache project/bead lists
4. **Multi-tab sync**: Not needed for MVP

---

## 3. MSW Handlers

### Status: Critical Gap (~12% coverage)

The testing guide shows only 2 example handlers. Full coverage is needed before component tests can be comprehensive.

### Current Coverage

From `TESTING_GUIDE.md`:

```typescript
// Only these are shown - INCOMPLETE
http.get('/api/projects', () => { /* ... */ })
http.get('/api/beads', () => { /* ... */ })
```

### Required Endpoints (From SIMPLIFIED_PLAN.md)

| Endpoint | Method | Priority | Handler Needed |
|----------|--------|----------|----------------|
| `/api/projects` | GET | High | List all projects |
| `/api/projects/{id}` | GET | High | Get single project |
| `/api/projects/{id}/beads` | GET | High | List beads for project |
| `/api/projects/{id}/work/{bead_id}` | POST | Critical | Execute work on bead |
| `/api/projects/{id}/review` | POST | Critical | Review changes |
| `/api/projects/{id}/push-pr` | POST | High | Push and create PR |
| `/api/projects/{id}/progress` | GET | Critical | Poll execution progress |
| `/api/projects/{id}/attach` | GET | Low | Terminal attach info |

### Complete Handler Implementation

Create `frontend/tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse, delay } from 'msw';

// Test fixtures
const mockProjects = [
  {
    id: 'proj-1',
    name: 'my-project',
    path: '/home/user/my-project',
    has_beads: true,
    container_status: 'running',
    branch: 'main',
  },
];

const mockBeads = [
  {
    id: 'beads-001',
    title: 'Fix authentication bug',
    description: 'Users cannot log in with special characters',
    status: 'open',
    priority: 1,
    type: 'bug',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    blocked_by: [],
    blocks: [],
  },
  {
    id: 'beads-002',
    title: 'Add user profile page',
    description: 'Create profile editing functionality',
    status: 'in_progress',
    priority: 2,
    type: 'feature',
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
    blocked_by: ['beads-001'],
    blocks: [],
  },
];

export const handlers = [
  // GET /api/projects - List all projects
  http.get('/api/projects', () => {
    return HttpResponse.json(mockProjects);
  }),

  // GET /api/projects/:id - Get single project
  http.get('/api/projects/:id', ({ params }) => {
    const project = mockProjects.find(p => p.id === params.id);
    if (!project) {
      return HttpResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json(project);
  }),

  // GET /api/projects/:id/beads - List beads
  http.get('/api/projects/:id/beads', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filtered = mockBeads;
    if (status) {
      filtered = mockBeads.filter(b => b.status === status);
    }
    return HttpResponse.json(filtered);
  }),

  // POST /api/projects/:id/work/:beadId - Execute work
  http.post('/api/projects/:id/work/:beadId', async ({ request }) => {
    const body = await request.json() as { context?: string };

    // Simulate execution time
    await delay(100);

    return HttpResponse.json({
      output: `Working on bead...\nContext: ${body.context || 'none'}\nCompleted successfully.`,
      state: 'completed',
      exit_code: 0,
    });
  }),

  // POST /api/projects/:id/review - Review changes
  http.post('/api/projects/:id/review', async () => {
    await delay(100);

    return HttpResponse.json({
      output: 'Reviewing changes...\nAll checks passed.\nNo issues found.',
      state: 'completed',
      exit_code: 0,
    });
  }),

  // POST /api/projects/:id/push-pr - Push and create PR
  http.post('/api/projects/:id/push-pr', async ({ request }) => {
    const body = await request.json() as { title?: string };

    await delay(100);

    return HttpResponse.json({
      push: 'Pushed to origin/feature-branch',
      pr: `https://github.com/user/repo/pull/42`,
    });
  }),

  // GET /api/projects/:id/progress - Poll progress
  http.get('/api/projects/:id/progress', () => {
    return HttpResponse.json({
      running: false,
      output: 'Execution complete.',
      recent: 'Execution complete.',
      bytes: 1024,
    });
  }),

  // GET /api/projects/:id/attach - Terminal attach info
  http.get('/api/projects/:id/attach', ({ params }) => {
    return HttpResponse.json({
      container_id: 'abc123',
      command: `docker exec -it abc123 /bin/bash`,
    });
  }),
];

// Error scenario handlers for specific tests
export const errorHandlers = {
  projectNotFound: http.get('/api/projects/:id', () => {
    return HttpResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }),

  executionFailed: http.post('/api/projects/:id/work/:beadId', () => {
    return HttpResponse.json({
      output: 'Error: Container not running',
      state: 'failed',
      exit_code: 1,
    });
  }),

  networkError: http.get('/api/projects', () => {
    return HttpResponse.error();
  }),
};
```

### Handler Test Setup

In test files:

```typescript
import { setupServer } from 'msw/node';
import { handlers, errorHandlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// For error scenarios in specific tests:
it('shows error when project not found', async () => {
  server.use(errorHandlers.projectNotFound);
  // ... test code
});
```

### Implementation Checklist

- [ ] Create `frontend/tests/mocks/handlers.ts` with all 8 endpoints
- [ ] Create `frontend/tests/mocks/fixtures.ts` for shared test data
- [ ] Add error scenario handlers
- [ ] Update test setup to use MSW consistently
- [ ] Remove direct vi.mock() calls in favor of MSW handlers

---

## 4. Terminal Embed Integration

### Status: Decision Required + Implementation Details Missing

Three options are documented in `SIMPLIFIED_PLAN.md` (lines 720-744), but no decision has been made and React integration is unspecified.

### Decision: Command Display (MVP), ttyd (Future)

**MVP Implementation: Option C - Show docker exec command**

Rationale:
- Zero additional dependencies (no ttyd/gotty installation)
- Works from any device with SSH/terminal access
- User already has terminal tools on their dev machine
- Simplest to implement and test

**Future Enhancement: Option A - ttyd**

When to upgrade: If users frequently need terminal access from mobile without a separate terminal app.

### MVP Implementation Spec

#### 4.1 TerminalEmbed Component (Command Display Mode)

```typescript
// frontend/src/components/TerminalEmbed.tsx

interface TerminalEmbedProps {
  projectId: string;
  onClose: () => void;
}

interface AttachInfo {
  container_id: string;
  command: string;
}

export function TerminalEmbed({ projectId, onClose }: TerminalEmbedProps) {
  const [attachInfo, setAttachInfo] = useState<AttachInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getAttachInfo(projectId)
      .then(info => {
        setAttachInfo(info);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to get container info');
        setLoading(false);
      });
  }, [projectId]);

  const handleCopy = async () => {
    if (attachInfo) {
      await navigator.clipboard.writeText(attachInfo.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <TerminalSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400 font-medium">Cannot connect to container</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
        <button onClick={onClose} className="mt-3 text-sm text-gray-400 underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-medium">Terminal Access</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-3">
        Run this command in your terminal to attach to the container:
      </p>

      <div className="bg-black rounded p-3 font-mono text-sm text-green-400 flex justify-between items-center">
        <code className="break-all">{attachInfo?.command}</code>
        <button
          onClick={handleCopy}
          className="ml-3 text-gray-400 hover:text-white flex-shrink-0"
          title="Copy to clipboard"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>

      <p className="text-gray-500 text-xs mt-3">
        Container ID: {attachInfo?.container_id.slice(0, 12)}
      </p>
    </div>
  );
}

function TerminalSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 animate-pulse">
      <div className="h-5 bg-gray-700 rounded w-32 mb-3"></div>
      <div className="h-4 bg-gray-800 rounded w-48 mb-3"></div>
      <div className="h-12 bg-black rounded"></div>
    </div>
  );
}
```

#### 4.2 ActionBar Terminal Button Integration

Update `handleTerminal` in ActionBar to show modal instead of opening new window:

```typescript
// In ActionBar.tsx
const [showTerminal, setShowTerminal] = useState(false);

const handleTerminal = () => {
  setShowTerminal(true);
};

// In render:
{showTerminal && (
  <TerminalEmbed
    projectId={projectId}
    onClose={() => setShowTerminal(false)}
  />
)}
```

#### 4.3 Future: ttyd Integration (Tier 2)

When implementing ttyd embed:

```typescript
// frontend/src/components/TerminalEmbed.tsx (ttyd mode)

interface TtydTerminalProps {
  projectId: string;
  ttydPort: number;  // Backend manages ttyd process
}

export function TtydTerminal({ projectId, ttydPort }: TtydTerminalProps) {
  // ttyd serves a web terminal at the specified port
  const ttydUrl = `http://${window.location.hostname}:${ttydPort}`;

  return (
    <iframe
      src={ttydUrl}
      className="w-full h-96 bg-black rounded-lg border border-gray-700"
      title="Terminal"
    />
  );
}
```

Backend changes required for ttyd:
- Add `/api/projects/{id}/terminal/start` endpoint that spawns ttyd
- Add `/api/projects/{id}/terminal/stop` endpoint for cleanup
- Track ttyd process lifecycle per project
- Handle port allocation (7681+ range)

### Implementation Checklist

- [ ] Create `TerminalEmbed.tsx` with command display mode
- [ ] Add `TerminalSkeleton` loading component
- [ ] Update ActionBar to use modal-based terminal display
- [ ] Add copy-to-clipboard functionality
- [ ] Test error states (container not running, network error)
- [ ] Document ttyd upgrade path for future reference

---

## 5. Loading, Error, and Empty States

### Status: Partially Specified

The ActionBar loading/error behavior is documented, but comprehensive UI patterns for all states are missing.

### 5.1 Loading States

#### Skeleton Components

Create reusable skeleton components for loading states:

```typescript
// frontend/src/components/skeletons.tsx

export function ProjectCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
      <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-700 rounded w-16"></div>
        <div className="h-6 bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
}

export function BeadItemSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-3 animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div className="h-5 bg-gray-700 rounded w-2/3"></div>
        <div className="h-5 bg-gray-700 rounded w-12"></div>
      </div>
      <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/3"></div>
    </div>
  );
}

export function OutputSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-4/6"></div>
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );
}

// Usage pattern
export function ProjectList() {
  const { data: projects, loading, error } = useProjects();

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => <ProjectCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!projects?.length) return <EmptyState type="projects" />;

  return /* render projects */;
}
```

#### Action Button Loading States

Already specified in `SIMPLIFIED_PLAN.md`. Button text patterns:

| Action | Default | Loading |
|--------|---------|---------|
| Work | "Work" | "Working... 2:34" |
| Review | "Review" | "Reviewing... 1:15" |
| Push & PR | "Push & PR" | "Pushing..." |

### 5.2 Error States

#### Error Message Catalog

Standard error messages for consistent UX:

```typescript
// frontend/src/utils/errors.ts

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect. Check your network connection.',
  TIMEOUT: 'Request timed out. The operation may still be running.',

  // Container errors
  CONTAINER_NOT_RUNNING: 'Container is not running. Start it first.',
  CONTAINER_NOT_FOUND: 'Container not found. It may have been removed.',
  CONTAINER_START_FAILED: 'Failed to start container. Check Docker is running.',

  // Execution errors
  EXECUTION_FAILED: 'Execution failed. Check output for details.',
  EXECUTION_BLOCKED: 'Claude is waiting for input. Open terminal to respond.',
  EXECUTION_CANCELLED: 'Execution was cancelled.',

  // Project/Bead errors
  PROJECT_NOT_FOUND: 'Project not found.',
  BEAD_NOT_FOUND: 'Bead not found. It may have been deleted.',
  NO_BEAD_SELECTED: 'Select a bead first.',

  // Auth/Permission errors (future)
  UNAUTHORIZED: 'Session expired. Please refresh.',
  FORBIDDEN: 'You don\'t have permission for this action.',

  // Generic fallback
  UNKNOWN: 'Something went wrong. Please try again.',
} as const;

// Map API error codes to messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'CONTAINER_NOT_RUNNING': return ERROR_MESSAGES.CONTAINER_NOT_RUNNING;
      case 'BEAD_NOT_FOUND': return ERROR_MESSAGES.BEAD_NOT_FOUND;
      // ... map other codes
      default: return error.message || ERROR_MESSAGES.UNKNOWN;
    }
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return ERROR_MESSAGES.UNKNOWN;
}
```

#### Error Display Component

```typescript
// frontend/src/components/ErrorState.tsx

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorState({ message, onRetry, action }: ErrorStateProps) {
  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
      <div className="text-red-400 text-3xl mb-3">⚠️</div>
      <p className="text-red-300 font-medium mb-2">{message}</p>

      <div className="flex gap-3 justify-center mt-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
          >
            Try Again
          </button>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 5.3 Empty States

```typescript
// frontend/src/components/EmptyState.tsx

type EmptyStateType = 'projects' | 'beads' | 'output';

const EMPTY_STATES: Record<EmptyStateType, { icon: string; title: string; description: string }> = {
  projects: {
    icon: '📁',
    title: 'No projects yet',
    description: 'Projects with .beads/ directories will appear here.',
  },
  beads: {
    icon: '📋',
    title: 'No beads found',
    description: 'Run "bd create" in the container to create your first bead.',
  },
  output: {
    icon: '💬',
    title: 'No output yet',
    description: 'Select a bead and click "Work" to start.',
  },
};

export function EmptyState({ type }: { type: EmptyStateType }) {
  const state = EMPTY_STATES[type];

  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3">{state.icon}</div>
      <h3 className="text-gray-300 font-medium mb-1">{state.title}</h3>
      <p className="text-gray-500 text-sm">{state.description}</p>
    </div>
  );
}
```

### 5.4 Toast Notifications

Use `react-hot-toast` for notifications (already in dependency recommendations):

```typescript
// frontend/src/utils/toast.ts
import toast from 'react-hot-toast';

// Consistent toast styling
const toastOptions = {
  duration: 4000,
  style: {
    background: '#1f2937',
    color: '#fff',
    border: '1px solid #374151',
  },
};

export const notify = {
  success: (msg: string) => toast.success(msg, toastOptions),
  error: (msg: string) => toast.error(msg, { ...toastOptions, duration: 6000 }),
  warning: (msg: string) => toast(msg, { ...toastOptions, icon: '⚠️' }),
  info: (msg: string) => toast(msg, { ...toastOptions, icon: 'ℹ️' }),
};

// Usage in ActionBar (replace direct toast calls):
// notify.error(getErrorMessage(err));
// notify.warning('Claude is blocked. Check terminal.');
```

### Implementation Checklist

- [ ] Create `skeletons.tsx` with ProjectCardSkeleton, BeadItemSkeleton, OutputSkeleton
- [ ] Create `ErrorState.tsx` component
- [ ] Create `EmptyState.tsx` component
- [ ] Create `utils/errors.ts` with ERROR_MESSAGES and getErrorMessage
- [ ] Create `utils/toast.ts` with notify wrapper
- [ ] Update ProjectList to use skeleton/error/empty states
- [ ] Update BeadList to use skeleton/error/empty states
- [ ] Update OutputView to use skeleton/empty states
- [ ] Add `react-hot-toast` to dependencies

---

## 6. PWA Terminal Access

### Status: Not Specified

How does a PWA on mobile access the terminal? The current `handleTerminal` opens a new window, but PWA behavior differs from browser.

### PWA Considerations

| Context | Behavior |
|---------|----------|
| **Desktop browser** | Opens new tab with terminal embed |
| **PWA (desktop)** | Opens new window (standalone mode) |
| **PWA (mobile)** | Cannot open external apps; must show in-app |
| **Mobile browser** | Could deep-link to SSH app, but unreliable |

### MVP Solution: In-App Modal with Copy Command

For MVP, use the same modal-based TerminalEmbed from Section 4. This works across all contexts:

```typescript
// ActionBar.tsx - unified approach
const handleTerminal = () => {
  // Don't open new window - show modal in current view
  setShowTerminal(true);
};
```

The command-copy approach works because:
- User has Tailscale access to the server
- User can paste command into any terminal (SSH app, desktop terminal)
- Works regardless of PWA vs browser context

### Future Enhancement: SSH URL Scheme

Some mobile apps support `ssh://` URL scheme:

```typescript
// Future: detect mobile and offer SSH deep-link
const handleTerminal = () => {
  if (isMobile() && attachInfo) {
    // Attempt SSH URL scheme (works with some apps like Termius)
    const sshUrl = `ssh://user@${hostname}?command=${encodeURIComponent(attachInfo.command)}`;
    window.location.href = sshUrl;

    // Fall back to modal after short delay
    setTimeout(() => setShowTerminal(true), 500);
  } else {
    setShowTerminal(true);
  }
};
```

### Implementation Checklist

- [ ] Use modal-based TerminalEmbed (Section 4) for all contexts
- [ ] Test PWA behavior on iOS Safari (Add to Home Screen)
- [ ] Test PWA behavior on Android Chrome
- [ ] Document SSH app recommendations in user-facing docs (optional)

---

## 7. PWA Manifest (Complete Specification)

### Status: Fully Specified

The PWA manifest requires additional fields beyond what's in FRONTEND_PLAN.md for full iOS/Android support.

### Complete Manifest Configuration

Update `vite.config.ts` with this complete manifest:

```typescript
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  manifest: {
    id: "/",
    name: "DevContainer",
    short_name: "DevContainer",
    description: "Manage software projects with Claude",
    theme_color: "#2563eb",
    background_color: "#111827",  // gray-900 for dark theme
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    scope: "/",
    categories: ["developer tools", "productivity"],
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
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",  // For Android adaptive icons
      },
      {
        src: "/icons/icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",  // iOS home screen
      },
    ],
  },
  // ... workbox config
})
```

### Required Icon Files

```
frontend/public/icons/
├── icon.svg              # Source SVG (for manual PNG conversion)
├── icon-180.png          # iOS home screen (180x180)
├── icon-192.png          # Android/PWA standard (192x192)
├── icon-512.png          # Android/PWA large (512x512)
└── apple-touch-icon.png  # iOS fallback (180x180, copy of icon-180.png)
```

### HTML Meta Tags

Add to `index.html` for iOS support:

```html
<head>
  <!-- PWA -->
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#2563eb">

  <!-- iOS PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="DevContainer">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
</head>
```

### Icon Design Specification

The icon should represent a container/box with code/development theme:

- **Safe zone**: Center 80% for maskable icons (Android crops to circle)
- **Background**: #2563eb (blue-600) or gradient
- **Foreground**: White container/cube outline with brackets `{ }`
- **Style**: Minimal, recognizable at small sizes

### Implementation Checklist

- [ ] Create icon.svg following design spec
- [ ] Generate PNGs: 180x180, 192x192, 512x512
- [ ] Copy icon-180.png to apple-touch-icon.png
- [ ] Add meta tags to index.html
- [ ] Update vite.config.ts manifest
- [ ] Test on iOS Safari "Add to Home Screen"
- [ ] Test on Android Chrome install prompt

---

## 8. Service Worker Caching Strategy

### Status: Fully Specified

Complete Workbox configuration for offline-capable PWA.

### Caching Strategies by Resource Type

| Resource Type | Strategy | Cache Name | Rationale |
|--------------|----------|------------|-----------|
| Static assets (JS, CSS) | CacheFirst | `static-assets` | Versioned by build, safe to cache long-term |
| HTML shell | NetworkFirst | `html-cache` | Ensure fresh app shell, fall back to cache |
| Images | CacheFirst | `images` | Rarely change, save bandwidth |
| API calls | NetworkFirst | `api-cache` | Need fresh data, but work offline with stale |
| Fonts | CacheFirst | `fonts` | Never change once loaded |

### Complete Workbox Configuration

```typescript
// vite.config.ts
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    // Precache app shell and static assets
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

    // Runtime caching rules
    runtimeCaching: [
      // API calls - NetworkFirst with 10s timeout
      {
        urlPattern: /^https:\/\/.*\.tailscale\.net\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },

      // Images - CacheFirst
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },

      // Fonts - CacheFirst
      {
        urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],

    // Skip waiting for immediate activation
    skipWaiting: true,
    clientsClaim: true,
  },
})
```

### Cache Size Limits

- **api-cache**: Max 50 entries, 1 hour expiration
- **images**: Max 100 entries, 30 days expiration
- **fonts**: Max 20 entries, 1 year expiration
- **static-assets**: Managed by precache (versioned)

### Update Behavior

- `registerType: "autoUpdate"` - New SW activates immediately when available
- `skipWaiting: true` - Don't wait for old tabs to close
- `clientsClaim: true` - Take control of all clients immediately

### Implementation Checklist

- [ ] Update vite.config.ts with complete workbox config
- [ ] Test offline behavior after caching
- [ ] Verify API cache works with stale data
- [ ] Test cache clearing on app update

---

## 9. Mobile Responsive Breakpoints

### Status: Fully Specified

Using default Tailwind breakpoints with defined layout behaviors.

### Breakpoint Definitions

| Breakpoint | Min Width | Device Target | Layout |
|------------|-----------|---------------|--------|
| (default)  | 0px       | Mobile phones | Single column, stacked |
| `sm:`      | 640px     | Large phones  | Slight padding adjustments |
| `md:`      | 768px     | Tablets       | Two-column where appropriate |
| `lg:`      | 1024px    | Laptops       | Full sidebar + content |
| `xl:`      | 1280px    | Desktops      | Max-width container centered |

### Layout Behavior by Breakpoint

#### Mobile (< 768px)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ Project Selector ▼  │  ← Dropdown instead of list
├─────────────────────┤
│ Bead List           │  ← Full width, scrollable
│ [Bead 1]            │
│ [Bead 2]            │
├─────────────────────┤
│ Action Bar          │  ← Fixed bottom
│ [Work] [Review] [⋮] │
├─────────────────────┤
│ Output (collapsed)  │  ← Expandable sheet
└─────────────────────┘
```

#### Tablet/Desktop (≥ 768px)
```
┌─────────────────────────────────────────┐
│ Header                                   │
├────────────┬────────────────────────────┤
│ Projects   │ Beads          │ Output    │
│ [Proj 1]   │ [Bead 1]       │ ...       │
│ [Proj 2]   │ [Bead 2]       │ ...       │
│            │ [Bead 3]       │ ...       │
│            ├────────────────┤           │
│            │ Action Bar     │           │
│            │ [Work][Review] │           │
└────────────┴────────────────┴───────────┘
```

### Component-Specific Responsive Behavior

#### App Layout
```tsx
// App.tsx
<div className="min-h-screen bg-gray-900">
  <Header />
  <main className="container mx-auto px-4 py-4 md:px-6 lg:px-8">
    {/* Mobile: stacked, md+: grid */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
      {/* Projects sidebar */}
      <aside className="md:col-span-3 lg:col-span-2">
        <ProjectList />
      </aside>

      {/* Beads + Actions */}
      <section className="md:col-span-5 lg:col-span-4">
        <BeadList />
        <ActionBar />
      </section>

      {/* Output panel */}
      <section className="md:col-span-4 lg:col-span-6">
        <OutputView />
      </section>
    </div>
  </main>
</div>
```

#### Mobile-Specific Components
```tsx
// Mobile project dropdown (shown < md)
<div className="md:hidden">
  <select className="w-full p-3 bg-gray-800 rounded-lg">
    {projects.map(p => <option key={p.id}>{p.name}</option>)}
  </select>
</div>

// Desktop project list (shown ≥ md)
<div className="hidden md:block">
  <ProjectList />
</div>
```

#### Action Bar (Fixed on Mobile)
```tsx
// ActionBar.tsx
<div className="
  fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4
  md:static md:border-t-0 md:bg-transparent md:p-0
">
  <div className="flex gap-3 justify-center md:justify-start">
    <Button>Work</Button>
    <Button>Review</Button>
    <Button>Push & PR</Button>
  </div>
</div>
```

#### Output View (Expandable Sheet on Mobile)
```tsx
// OutputView.tsx - Mobile bottom sheet
<div className="
  fixed bottom-16 left-0 right-0 h-1/2 bg-gray-900 rounded-t-xl
  transform transition-transform
  md:static md:h-auto md:rounded-lg
  {expanded ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
">
  {/* Drag handle - mobile only */}
  <div className="md:hidden h-8 flex items-center justify-center">
    <div className="w-12 h-1 bg-gray-600 rounded-full" />
  </div>
  <div className="p-4 overflow-y-auto max-h-[calc(100%-2rem)] md:max-h-96">
    {/* Output content */}
  </div>
</div>
```

### Touch Targets

Minimum touch target sizes for mobile:
- Buttons: `min-h-[44px] min-w-[44px]` (Apple HIG)
- List items: `py-3` minimum padding
- Icons: `p-2` clickable area around icon

```tsx
// Mobile-friendly button
<button className="
  px-4 py-3 min-h-[44px]
  text-base
  md:px-3 md:py-2 md:min-h-0 md:text-sm
">
  Work
</button>
```

### Implementation Checklist

- [ ] Set up Tailwind with default breakpoints
- [ ] Implement responsive grid layout in App.tsx
- [ ] Create mobile project dropdown component
- [ ] Make ActionBar fixed on mobile
- [ ] Create expandable OutputView sheet for mobile
- [ ] Ensure 44px minimum touch targets
- [ ] Test on iOS Safari and Android Chrome

---

## 10. Offline Behavior

### Status: Fully Specified

Strategy: Show cached data, disable actions when offline.

### Offline Detection

```typescript
// frontend/src/hooks/useOnlineStatus.ts

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Offline Banner Component

```typescript
// frontend/src/components/OfflineBanner.tsx

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="
      fixed top-0 left-0 right-0 z-50
      bg-amber-600 text-white text-center py-2 px-4
      text-sm font-medium
    ">
      You're offline. Showing cached data. Actions disabled.
    </div>
  );
}
```

### Disabled Actions When Offline

```typescript
// ActionBar.tsx

export function ActionBar({ projectId, selectedBead }: ActionBarProps) {
  const isOnline = useOnlineStatus();

  const handleWork = async () => {
    if (!isOnline) return;  // Guard
    // ... execute work
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleWork}
        disabled={!selectedBead || !isOnline}
        className={`
          px-4 py-2 rounded-lg font-medium
          ${isOnline
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
        `}
        title={isOnline ? 'Execute work on bead' : 'Offline - action disabled'}
      >
        Work
      </button>
      {/* Same pattern for Review, Push & PR */}
    </div>
  );
}
```

### Cached Data Display

When offline, the service worker serves cached API responses:

```typescript
// useProjects.ts - No special handling needed

export function useProjects() {
  const [data, setData] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      // Service worker returns cached response when offline
      const projects = await api.listProjects();
      setData(projects);
      setError(null);
    } catch (e) {
      // Only show error if online (offline has cached data or empty state)
      if (isOnline) {
        setError(e instanceof Error ? e.message : 'Failed to fetch');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
```

### Stale Data Indicator

Show when data might be outdated:

```typescript
// frontend/src/components/StaleDataBadge.tsx

interface StaleDataBadgeProps {
  lastFetched: Date | null;
}

export function StaleDataBadge({ lastFetched }: StaleDataBadgeProps) {
  const isOnline = useOnlineStatus();

  if (isOnline || !lastFetched) return null;

  const ageMinutes = Math.floor((Date.now() - lastFetched.getTime()) / 60000);

  return (
    <span className="
      inline-flex items-center gap-1
      text-xs text-amber-400 bg-amber-900/30
      px-2 py-0.5 rounded
    ">
      <span>📡</span>
      Cached {ageMinutes}m ago
    </span>
  );
}
```

### Behavior Summary

| State | Projects | Beads | Actions | Output |
|-------|----------|-------|---------|--------|
| **Online** | Live data | Live data | Enabled | Real-time |
| **Offline (cached)** | Cached data + badge | Cached data + badge | Disabled + tooltip | Last output |
| **Offline (no cache)** | Empty state | Empty state | Disabled | Empty state |

### Implementation Checklist

- [ ] Create `useOnlineStatus` hook
- [ ] Create `OfflineBanner` component
- [ ] Add offline guard to all action handlers
- [ ] Style disabled buttons for offline state
- [ ] Create `StaleDataBadge` component
- [ ] Add banner to App.tsx layout
- [ ] Test offline behavior in DevTools

---

## Resolution Priority

1. **MSW Handlers** (Critical) - Block component testing
2. **TypeScript Types** (High) - Needed at implementation start
3. **PWA Manifest** (High) - Required for mobile install
4. **Service Worker Caching** (High) - Enables offline mode
5. **Responsive Breakpoints** (High) - Mobile usability
6. **Offline Behavior** (Medium) - UX polish
7. **State Management** (Done) - Already decided, no action needed
8. **Loading/Error/Empty States** (High) - Core UX patterns
9. **Terminal Embed** (Medium) - Needed for Epic 5.3
10. **PWA Terminal Access** (Low) - Modal approach works, enhancements can wait

## See Also

- `SIMPLIFIED_PLAN.md` - API specification source
- `FRONTEND_PLAN.md` - Type definitions source
- `TESTING_GUIDE.md` - Test setup patterns
- `examples/adding-component.md` - Component implementation patterns
