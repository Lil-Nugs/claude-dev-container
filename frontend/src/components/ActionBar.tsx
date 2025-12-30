interface ActionBarProps {
  /** Whether a project is selected */
  hasProject: boolean;
  /** Whether a bead is selected */
  hasBead: boolean;
  /** Whether an action is currently executing */
  isExecuting: boolean;
  /** Current action being executed */
  currentAction?: "work" | "review" | "push-pr" | null | undefined;
  /** Elapsed time in seconds for current action */
  elapsedTime?: number | undefined;
  /** Callbacks for each action */
  onWork: () => void;
  onReview: () => void;
  onPushPR: () => void;
  onTerminal: () => void;
  onRefresh?: (() => void) | undefined;
}

/**
 * Format elapsed time as mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ActionBar component - sticky bottom action bar for the main actions.
 * Work, Review, Push/PR, Terminal buttons.
 * Mobile-first responsive design with touch-friendly interactions.
 */
export function ActionBar({
  hasProject,
  hasBead,
  isExecuting,
  currentAction,
  elapsedTime = 0,
  onWork,
  onReview,
  onPushPR,
  onTerminal,
  onRefresh,
}: ActionBarProps): JSX.Element {
  const workDisabled = !hasProject || !hasBead || isExecuting;
  const reviewDisabled = !hasProject || isExecuting;
  const pushPRDisabled = !hasProject || isExecuting;
  const terminalDisabled = !hasProject;

  // Get button label with elapsed time if executing
  const getButtonLabel = (
    action: "work" | "review" | "push-pr",
    label: string,
    activeLabel: string
  ): string => {
    if (isExecuting && currentAction === action) {
      return `${activeLabel} ${formatTime(elapsedTime)}`;
    }
    return label;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg safe-area-inset-bottom">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Terminal button - left side */}
          <button
            onClick={onTerminal}
            disabled={terminalDisabled}
            className={`
              flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-lg
              text-sm font-medium transition-colors min-h-[44px] touch-manipulation
              ${
                terminalDisabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900"
              }
            `}
            data-testid="action-terminal"
            aria-label="Open terminal"
          >
            <svg
              className="w-5 h-5 sm:mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="hidden sm:inline">Terminal</span>
          </button>

          {/* Main actions - right side */}
          <div className="flex items-center gap-2">
            {/* Refresh button - only show during execution */}
            {isExecuting && onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center justify-center p-2.5 rounded-lg
                  text-gray-600 hover:bg-gray-100 active:bg-gray-200
                  transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                data-testid="action-refresh"
                aria-label="Refresh progress"
              >
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}

            {/* Work button */}
            <button
              onClick={onWork}
              disabled={workDisabled}
              className={`
                flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-lg
                text-sm font-medium transition-colors min-h-[44px] touch-manipulation
                ${
                  workDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                }
              `}
              data-testid="action-work"
              aria-label="Run work on selected bead"
            >
              {getButtonLabel("work", "Work", "Working...")}
            </button>

            {/* Review button */}
            <button
              onClick={onReview}
              disabled={reviewDisabled}
              className={`
                flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-lg
                text-sm font-medium transition-colors min-h-[44px] touch-manipulation
                ${
                  reviewDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
                }
              `}
              data-testid="action-review"
              aria-label="Run review"
            >
              {getButtonLabel("review", "Review", "Reviewing...")}
            </button>

            {/* Push/PR button */}
            <button
              onClick={onPushPR}
              disabled={pushPRDisabled}
              className={`
                flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-lg
                text-sm font-medium transition-colors min-h-[44px] touch-manipulation
                ${
                  pushPRDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                }
              `}
              data-testid="action-push-pr"
              aria-label="Push and create PR"
            >
              {getButtonLabel("push-pr", "Push/PR", "Pushing...")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActionBar;
