import { useState, useEffect, useCallback } from "react";
import type { AttachInfo } from "../types";

interface TerminalEmbedProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Function to fetch attach info, allows dependency injection for testing */
  getAttachInfo: () => Promise<AttachInfo>;
  /** Optional error message from parent */
  error?: string | null;
}

type CopyState = "idle" | "copied" | "error";

/**
 * TerminalEmbed component - MVP modal showing docker exec command with copy button.
 *
 * This component displays container attach information, allowing users to copy
 * the docker exec command to their clipboard for manual terminal access.
 *
 * Future enhancement: ttyd iframe embed for in-browser terminal.
 */
export function TerminalEmbed({
  isOpen,
  onClose,
  getAttachInfo,
  error: externalError,
}: TerminalEmbedProps): JSX.Element | null {
  const [attachInfo, setAttachInfo] = useState<AttachInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Fetch attach info when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setAttachInfo(null);
      setError(null);
      setCopyState("idle");
      return;
    }

    const fetchAttachInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await getAttachInfo();
        setAttachInfo(info);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get container info";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachInfo();
  }, [isOpen, getAttachInfo]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!attachInfo?.command) return;

    try {
      await navigator.clipboard.writeText(attachInfo.command);
      setCopyState("copied");
      // Reset after 2 seconds
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [attachInfo?.command]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  const displayError = externalError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      data-testid="terminal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        data-testid="terminal-backdrop"
        aria-hidden="true"
      />

      {/* Modal content - slides up from bottom on mobile */}
      <div
        className="
          relative bg-white shadow-xl overflow-hidden w-full
          rounded-t-2xl sm:rounded-lg
          max-h-[90vh] sm:max-h-none
          sm:max-w-lg sm:mx-4
          safe-area-inset-bottom
        "
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2
            id="terminal-modal-title"
            className="text-base sm:text-lg font-semibold text-gray-900"
          >
            Terminal Access
          </h2>
          <button
            onClick={onClose}
            className="
              text-gray-400 hover:text-gray-600 transition-colors
              p-2 -mr-2 min-h-[44px] min-w-[44px]
              flex items-center justify-center
            "
            data-testid="terminal-close"
            aria-label="Close terminal modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4">
          {loading && (
            <div
              className="flex items-center justify-center py-6 sm:py-8"
              data-testid="terminal-loading"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
              <span className="ml-3 text-gray-600 text-sm sm:text-base">Loading container info...</span>
            </div>
          )}

          {displayError && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4"
              data-testid="terminal-error"
              role="alert"
            >
              <p className="text-red-800 font-medium text-sm sm:text-base">Container not available</p>
              <p className="text-red-600 text-xs sm:text-sm mt-1">{displayError}</p>
            </div>
          )}

          {attachInfo && !loading && !displayError && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-gray-600 text-xs sm:text-sm">
                Run this command in your terminal to attach to the container:
              </p>

              {/* Command display */}
              <div className="relative">
                <div
                  className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm break-all pr-16"
                  data-testid="terminal-command"
                >
                  {attachInfo.command}
                </div>

                {/* Copy button - touch friendly */}
                <button
                  onClick={handleCopy}
                  className={`
                    absolute top-2 right-2 px-3 py-1.5 rounded text-xs font-medium
                    transition-colors touch-manipulation min-h-[36px]
                    ${copyState === "copied"
                      ? "bg-green-500 text-white"
                      : copyState === "error"
                      ? "bg-red-500 text-white"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 active:bg-gray-500"
                    }
                  `}
                  data-testid="copy-command"
                  aria-label={
                    copyState === "copied"
                      ? "Command copied"
                      : copyState === "error"
                      ? "Copy failed"
                      : "Copy command to clipboard"
                  }
                >
                  {copyState === "copied" ? "Copied!" : copyState === "error" ? "Failed" : "Copy"}
                </button>
              </div>

              {/* Container ID info */}
              <div className="text-xs text-gray-500">
                <span>Container ID: </span>
                <code
                  className="bg-gray-100 px-1 py-0.5 rounded"
                  data-testid="container-id"
                >
                  {attachInfo.container_id.substring(0, 12)}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer - touch-friendly close button */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="
              w-full bg-gray-800 text-white py-3 px-4 rounded-lg
              hover:bg-gray-700 active:bg-gray-900
              transition-colors font-medium
              min-h-[44px] touch-manipulation
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TerminalEmbed;
