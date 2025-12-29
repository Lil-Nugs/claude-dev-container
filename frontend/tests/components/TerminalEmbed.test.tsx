import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TerminalEmbed } from "../../src/components/TerminalEmbed";
import type { AttachInfo } from "../../src/types";

describe("TerminalEmbed", () => {
  const mockAttachInfo: AttachInfo = {
    container_id: "abc123def456789",
    command: "docker exec -it abc123def456 /bin/bash",
  };

  const mockGetAttachInfo = vi.fn<[], Promise<AttachInfo>>();

  beforeEach(() => {
    mockGetAttachInfo.mockResolvedValue(mockAttachInfo);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Modal visibility", () => {
    it("should not render when isOpen is false", () => {
      render(
        <TerminalEmbed
          isOpen={false}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      expect(screen.queryByTestId("terminal-modal")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      expect(screen.getByTestId("terminal-modal")).toBeInTheDocument();

      // Wait for async fetch to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });

    it("should have correct accessibility attributes", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      const modal = screen.getByTestId("terminal-modal");
      expect(modal).toHaveAttribute("role", "dialog");
      expect(modal).toHaveAttribute("aria-modal", "true");
      expect(modal).toHaveAttribute("aria-labelledby", "terminal-modal-title");

      // Wait for async fetch to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("should show loading indicator while fetching attach info", async () => {
      mockGetAttachInfo.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      expect(screen.getByTestId("terminal-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading container info...")).toBeInTheDocument();
    });

    it("should hide loading indicator after fetch completes", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });
  });

  describe("Attach info display", () => {
    it("should display the docker exec command", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("terminal-command")).toHaveTextContent(
          "docker exec -it abc123def456 /bin/bash"
        );
      });
    });

    it("should display truncated container ID", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("container-id")).toHaveTextContent(
          "abc123def456"
        );
      });
    });

    it("should have terminal-like styling for command", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        const command = screen.getByTestId("terminal-command");
        expect(command).toHaveClass("bg-gray-900", "text-green-400", "font-mono");
      });
    });
  });

  describe("Error handling", () => {
    it("should display error when fetch fails", async () => {
      mockGetAttachInfo.mockRejectedValue(new Error("Container not running"));

      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("terminal-error")).toBeInTheDocument();
        expect(screen.getByText("Container not running")).toBeInTheDocument();
      });
    });

    it("should display external error prop", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
          error="External error message"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("terminal-error")).toBeInTheDocument();
        expect(screen.getByText("External error message")).toBeInTheDocument();
      });
    });

    it("should have alert role on error", async () => {
      mockGetAttachInfo.mockRejectedValue(new Error("Failed"));

      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("terminal-error")).toHaveAttribute("role", "alert");
      });
    });
  });

  describe("Copy functionality", () => {
    it("should have a copy button", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toBeInTheDocument();
      });
    });

    it("should copy command to clipboard when copy button is clicked", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("copy-command"));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "docker exec -it abc123def456 /bin/bash"
      );

      // Wait for copy state update to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toHaveTextContent(/Copy|Copied!/);
      });
    });

    it("should show 'Copied!' after successful copy", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("copy-command"));

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toHaveTextContent("Copied!");
      });
    });

    it("should show 'Failed' when copy fails", async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Clipboard error")
      );

      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("copy-command"));

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toHaveTextContent("Failed");
      });
    });

    it("should have green background when copied", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("copy-command"));

      await waitFor(() => {
        expect(screen.getByTestId("copy-command")).toHaveClass("bg-green-500");
      });
    });
  });

  describe("Close functionality", () => {
    it("should call onClose when close button is clicked", async () => {
      const onClose = vi.fn();
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={onClose}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      // Wait for async fetch to complete first
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("terminal-close"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when backdrop is clicked", async () => {
      const onClose = vi.fn();
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={onClose}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      // Wait for async fetch to complete first
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("terminal-backdrop"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when escape key is pressed", async () => {
      const onClose = vi.fn();
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={onClose}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      // Wait for async fetch to complete first
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should have close button with aria-label", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      expect(screen.getByTestId("terminal-close")).toHaveAttribute(
        "aria-label",
        "Close terminal modal"
      );

      // Wait for async fetch to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });
  });

  describe("State reset on close", () => {
    it("should refetch attach info when reopened", async () => {
      const { rerender } = render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(mockGetAttachInfo).toHaveBeenCalledTimes(1);
      });

      // Close modal
      rerender(
        <TerminalEmbed
          isOpen={false}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      // Reopen modal
      rerender(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(mockGetAttachInfo).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Modal structure", () => {
    it("should have a title", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      expect(screen.getByText("Terminal Access")).toBeInTheDocument();

      // Wait for async fetch to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });

    it("should have footer close button", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      const closeButtons = screen.getAllByText("Close");
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);

      // Wait for async fetch to complete to avoid act() warnings
      await waitFor(() => {
        expect(screen.queryByTestId("terminal-loading")).not.toBeInTheDocument();
      });
    });

    it("should show instruction text", async () => {
      render(
        <TerminalEmbed
          isOpen={true}
          onClose={vi.fn()}
          getAttachInfo={mockGetAttachInfo}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/run this command in your terminal/i)
        ).toBeInTheDocument();
      });
    });
  });
});
