import type { Bead, BeadStatus, BeadType } from "../types";

interface BeadListProps {
  beads: Bead[];
  loading: boolean;
  onSelect: (beadId: string) => void;
  selectedBeadId?: string;
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
 */
export function BeadList({
  beads,
  loading,
  onSelect,
  selectedBeadId,
}: BeadListProps): JSX.Element {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        role="progressbar"
        aria-label="Loading beads"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (beads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500" data-testid="empty-beads">
        No beads found
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200" data-testid="bead-list">
      {beads.map((bead) => (
        <li
          key={bead.id}
          onClick={() => onSelect(bead.id)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedBeadId === bead.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
          }`}
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
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Bead ID and Title */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">{bead.id}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityLabel(bead.priority) === "P1" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}
                >
                  {getPriorityLabel(bead.priority)}
                </span>
              </div>
              <h3 className="mt-1 text-sm font-medium text-gray-900 truncate">
                {bead.title}
              </h3>

              {/* Description preview if available */}
              {bead.description && (
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {bead.description}
                </p>
              )}
            </div>

            {/* Status and Type badges */}
            <div className="flex flex-col items-end gap-1 ml-4">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(bead.status)}`}
              >
                {bead.status.replace("_", " ")}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(bead.type)}`}
              >
                {bead.type}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default BeadList;
