import { useEffect, useRef } from "react";
import type { ExecutionState } from "../types";

interface OutputViewProps {
  output: string;
  state?: ExecutionState;
  autoScroll?: boolean;
}

/**
 * Get background/border color class based on execution state
 */
function getStateStyles(state?: ExecutionState): {
  border: string;
  header: string;
  text: string;
} {
  switch (state) {
    case "completed":
      return {
        border: "border-green-500",
        header: "bg-green-100 text-green-800",
        text: "Completed",
      };
    case "blocked":
      return {
        border: "border-yellow-500",
        header: "bg-yellow-100 text-yellow-800",
        text: "Blocked",
      };
    case "failed":
      return {
        border: "border-red-500",
        header: "bg-red-100 text-red-800",
        text: "Failed",
      };
    case "cancelled":
      return {
        border: "border-gray-500",
        header: "bg-gray-100 text-gray-800",
        text: "Cancelled",
      };
    default:
      return {
        border: "border-gray-300",
        header: "bg-gray-100 text-gray-600",
        text: "Output",
      };
  }
}

/**
 * OutputView component - displays Claude output with state-based styling.
 * Completed = green, Blocked = yellow, Failed = red.
 * Scrollable with monospace font.
 * Mobile-first responsive design.
 */
export function OutputView({
  output,
  state,
  autoScroll = true,
}: OutputViewProps): JSX.Element {
  const outputRef = useRef<HTMLPreElement>(null);
  const styles = getStateStyles(state);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  if (!output && !state) {
    return (
      <div
        className="flex items-center justify-center h-48 sm:h-64 bg-gray-50 rounded-lg border border-gray-200 px-4"
        data-testid="output-view-empty"
      >
        <p className="text-gray-500 text-sm sm:text-base text-center">
          No output yet. Run an action to see results.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden ${styles.border}`}
      data-testid="output-view"
    >
      {/* State header - responsive padding and font sizes */}
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between ${styles.header}`}>
        <span className="font-medium text-xs sm:text-sm" data-testid="output-state">
          {styles.text}
        </span>
        {output && (
          <span className="text-xs opacity-75">
            {output.length.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* Output content - responsive height and text size */}
      <pre
        ref={outputRef}
        className="
          p-3 sm:p-4 bg-gray-900 text-gray-100 font-mono
          text-xs sm:text-sm overflow-auto
          max-h-64 sm:max-h-80 md:max-h-96
          whitespace-pre-wrap break-words
          overscroll-contain
        "
        data-testid="output-content"
        role="log"
        aria-label="Command output"
      >
        {output || <span className="text-gray-500 italic">No output</span>}
      </pre>
    </div>
  );
}

export default OutputView;
