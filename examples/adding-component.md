# Adding a New React Component

Step-by-step guide for adding a frontend component.

## File Structure

```
frontend/
└── src/
    ├── components/
    │   └── YourComponent/
    │       ├── YourComponent.tsx      # Component
    │       ├── YourComponent.test.tsx # Tests
    │       └── index.ts               # Export
    ├── hooks/
    │   └── useYourHook.ts             # Custom hooks
    ├── api/
    │   └── yourApi.ts                 # API client
    └── types/
        └── your.ts                    # TypeScript types
```

## Example: Project List Component

### Step 1: Define Types

`frontend/src/types/project.ts`:
```typescript
export interface Project {
  id: string;
  name: string;
  path: string;
  hasBeads: boolean;
}
```

### Step 2: Create API Client

`frontend/src/api/projects.ts`:
```typescript
import { Project } from '../types/project';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
}
```

### Step 3: Create Custom Hook

`frontend/src/hooks/useProjects.ts`:
```typescript
import { useState, useEffect } from 'react';
import { Project } from '../types/project';
import { fetchProjects } from '../api/projects';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return { projects, loading, error, refetch: loadProjects };
}
```

### Step 4: Create Component

`frontend/src/components/ProjectList/ProjectList.tsx`:
```typescript
import { useProjects } from '../../hooks/useProjects';
import { Project } from '../../types/project';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
}

function ProjectCard({ project, onSelect }: ProjectCardProps) {
  return (
    <button
      onClick={() => onSelect(project)}
      className="project-card"
    >
      <h3>{project.name}</h3>
      <p>{project.path}</p>
      {project.hasBeads && <span className="badge">beads</span>}
    </button>
  );
}

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
}

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const { projects, loading, error, refetch } = useProjects();

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (projects.length === 0) {
    return <div className="empty">No projects found</div>;
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onSelect={onSelectProject}
        />
      ))}
    </div>
  );
}
```

### Step 5: Add Export

`frontend/src/components/ProjectList/index.ts`:
```typescript
export { ProjectList } from './ProjectList';
```

### Step 6: Write Tests

`frontend/src/components/ProjectList/ProjectList.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectList } from './ProjectList';
import * as projectsApi from '../../api/projects';

// Mock the API
vi.mock('../../api/projects');

const mockProjects = [
  { id: '1', name: 'project-a', path: '/home/user/projects/project-a', hasBeads: true },
  { id: '2', name: 'project-b', path: '/home/user/projects/project-b', hasBeads: false },
];

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(projectsApi.fetchProjects).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ProjectList onSelectProject={() => {}} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders projects after loading', async () => {
    vi.mocked(projectsApi.fetchProjects).mockResolvedValue(mockProjects);

    render(<ProjectList onSelectProject={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('project-a')).toBeInTheDocument();
      expect(screen.getByText('project-b')).toBeInTheDocument();
    });
  });

  it('shows beads badge for projects with beads', async () => {
    vi.mocked(projectsApi.fetchProjects).mockResolvedValue(mockProjects);

    render(<ProjectList onSelectProject={() => {}} />);

    await waitFor(() => {
      const badges = screen.getAllByText('beads');
      expect(badges).toHaveLength(1); // Only project-a has beads
    });
  });

  it('calls onSelectProject when clicking a project', async () => {
    vi.mocked(projectsApi.fetchProjects).mockResolvedValue(mockProjects);
    const onSelect = vi.fn();

    render(<ProjectList onSelectProject={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('project-a')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('project-a'));

    expect(onSelect).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('shows error state and retry button', async () => {
    vi.mocked(projectsApi.fetchProjects).mockRejectedValue(new Error('Network error'));

    render(<ProjectList onSelectProject={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('retries on error when clicking retry', async () => {
    vi.mocked(projectsApi.fetchProjects)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockProjects);

    render(<ProjectList onSelectProject={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('project-a')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects', async () => {
    vi.mocked(projectsApi.fetchProjects).mockResolvedValue([]);

    render(<ProjectList onSelectProject={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });
});
```

### Step 7: Run Tests

```bash
cd frontend

# Run tests for your component
npm test -- src/components/ProjectList/ProjectList.test.tsx

# Run all tests
npm run test:run

# Check linting
npm run lint

# Check types
npm run typecheck
```

## Checklist

- [ ] Types defined in `types/`
- [ ] API client in `api/`
- [ ] Custom hook in `hooks/` (if needed)
- [ ] Component with proper TypeScript types
- [ ] Export from `index.ts`
- [ ] Tests cover loading, success, error, and empty states
- [ ] Tests cover user interactions
- [ ] All tests passing
- [ ] Linter passing
- [ ] Types checking

## Patterns to Follow

### Props Interface
Always define props interface:
```typescript
interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}
```

### Error Handling
Show error state with retry option:
```typescript
if (error) {
  return (
    <div className="error">
      <p>{error}</p>
      <button onClick={refetch}>Retry</button>
    </div>
  );
}
```

### Loading States
Show loading indicator:
```typescript
if (loading) {
  return <div className="loading">Loading...</div>;
}
```

### Empty States
Handle empty data gracefully:
```typescript
if (items.length === 0) {
  return <div className="empty">No items found</div>;
}
```
