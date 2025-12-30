import type { Bead, BeadStatus, BeadType } from "../types";

interface BeadListProps {
  beads: Bead[];
  loading: boolean;
  onSelect: (beadId: string) => void;
  selectedBeadId?: string | undefined;
  /** Current status filter */
  statusFilter?: BeadStatus | null | undefined;
  /** Callback when status filter changes */
  onStatusFilterChange?: ((status: BeadStatus | null) => void) | undefined;
}

/**
 * Get background color class based on bead status
 */
function getStatusColor(status: BeadStatus): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "closed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get badge color class based on bead type
 */
function getTypeColor(type: BeadType): string {
  switch (type) {
    case "epic":
      return "bg-purple-100 text-purple-800";
    case "feature":
      return "bg-indigo-100 text-indigo-800";
    case "bug":
      return "bg-red-100 text-red-800";
    case "task":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get priority display
 */
function getPriorityLabel(priority: number): string {
  return `P${priority}`;
}

/**
 * BeadList component - displays a list of beads for a selected project.
 * Shows id, title, status, type, and priority. Beads are selectable for actions.
 * Mobile-first responsive design with touch-friendly interactions.
 */
export function BeadList({
  beads,
  loading,
  onSelect,
  selectedBeadId,
  statusFilter,
  onStatusFilterChange,
}: BeadListProps): JSX.Element {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-8 sm:py-12"
        role="progressbar"
        aria-label="Loading beads"
        data-testid="loading-beads"
      >
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter dropdown component
  const FilterDropdown = onStatusFilterChange ? (
    <div className="mb-3 flex items-center gap-2">
      <label htmlFor="status-filter" className="text-sm text-gray-600">
        Filter by status:
      </label>
      <select
        id="status-filter"
        value={statusFilter || ""}
        onChange={(e) =>
          onStatusFilterChange(
            e.target.value ? (e.target.value as BeadStatus) : null
          )
        }
        className="
          px-3 py-1.5 rounded border border-gray-300 bg-white
          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          min-h-[36px]
        "
        data-testid="filter-status"
      >
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </select>
    </div>
  ) : null;

  if (beads.length === 0) {
    return (
      <div>
        {FilterDropdown}
        <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base" data-testid="empty-beads">
          No beads found
        </div>
      </div>
    );
  }

  return (
    <div>
      {FilterDropdown}
      <ul className="divide-y divide-gray-200" data-testid="bead-list">
      {beads.map((bead) => (
        <li
          key={bead.id}
          onClick={() => onSelect(bead.id)}
          className={`
            p-3 sm:p-4 cursor-pointer transition-colors touch-manipulation no-select
            min-h-[44px] active:bg-gray-100
            hover:bg-gray-50
            ${selectedBeadId === bead.id
              ? "bg-blue-50 border-l-4 border-blue-500"
              : ""
            }
          `}
          data-testid="bead-item"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(bead.id);
            }
          }}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              {/* Bead ID and Priority - stack on very small screens */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-mono text-gray-500 truncate max-w-[120px] sm:max-w-none">
                  {bead.id}
                </span>
                <span
                  className={`
                    inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium
                    ${getPriorityLabel(bead.priority) === "P1"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
                    }
                  `}
                >
                  {getPriorityLabel(bead.priority)}
                </span>
              </div>

              {/* Title - larger on mobile for easier reading */}
              <h3 className="mt-1.5 sm:mt-1 text-sm sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">
                {bead.title}
              </h3>

              {/* Description preview - hidden on very small screens */}
              {bead.description && (
                <p className="hidden sm:block mt-1 text-xs text-gray-500 truncate">
                  {bead.description}
                </p>
              )}
            </div>

            {/* Status and Type badges - vertical layout */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`
                  inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
                  ${getStatusColor(bead.status)}
                `}
              >
                {bead.status.replace("_", " ")}
              </span>
              <span
                className={`
                  inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium
                  ${getTypeColor(bead.type)}
                `}
              >
                {bead.type}
              </span>
            </div>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}

export default BeadList;
