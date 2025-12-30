import type { Project } from "../types";

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProjectId?: string | undefined;
  onSelect: (projectId: string) => void;
}

/**
 * ProjectList component - displays a list of projects.
 * Shows project name and path. Projects are selectable for actions.
 * Mobile-first responsive design with touch-friendly interactions.
 */
export function ProjectList({
  projects,
  loading,
  error,
  selectedProjectId,
  onSelect,
}: ProjectListProps): JSX.Element {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-8 sm:py-12"
        role="progressbar"
        aria-label="Loading projects"
      >
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center"
        data-testid="error-state"
        role="alert"
      >
        <p className="text-red-800 font-medium text-sm sm:text-base">
          Failed to load projects
        </p>
        <p className="text-red-600 text-xs sm:text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base"
        data-testid="empty-projects"
      >
        No projects found in ~/projects/
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="project-list">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelect(project.id)}
          className={`
            p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors touch-manipulation
            min-h-[44px] active:bg-gray-100
            ${
              selectedProjectId === project.id
                ? "bg-blue-50 border-blue-500"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }
          `}
          data-testid="project-card"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(project.id);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                {project.name}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {project.path}
              </p>
            </div>
            {project.has_beads && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                beads
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectList;
