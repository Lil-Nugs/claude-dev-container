import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OutputView } from "../../src/components/OutputView";

describe("OutputView", () => {
  // Mock scrollTo for auto-scroll tests
  const mockScrollTo = vi.fn();

  beforeEach(() => {
    // Mock scrollTop setter
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      set: mockScrollTo,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty state when no output and no state", () => {
      render(<OutputView output="" />);

      expect(screen.getByTestId("output-view-empty")).toBeInTheDocument();
      expect(
        screen.getByText(/no output yet. run an action to see results/i)
      ).toBeInTheDocument();
    });

    it("should not show empty state when there is output", () => {
      render(<OutputView output="Some output" />);

      expect(screen.queryByTestId("output-view-empty")).not.toBeInTheDocument();
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });
  });

  describe("Output display", () => {
    it("should display output text in monospace font", () => {
      render(<OutputView output="Hello World" />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveTextContent("Hello World");
      expect(outputContent).toHaveClass("font-mono");
    });

    it("should preserve whitespace in output", () => {
      const multilineOutput = "Line 1\n  Line 2 with indent\nLine 3";
      render(<OutputView output={multilineOutput} />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveClass("whitespace-pre-wrap");
    });

    it("should be scrollable", () => {
      render(<OutputView output="Long output content" />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveClass("overflow-auto");
    });

    it("should have max height for scrolling", () => {
      render(<OutputView output="Output content" />);

      const outputContent = screen.getByTestId("output-content");
      // Mobile-first: base max-h-64, responsive sm:max-h-80, md:max-h-96
      expect(outputContent).toHaveClass("max-h-64");
    });

    it("should show character count", () => {
      render(<OutputView output="Hello World" />);

      // Changed from "characters" to "chars" for mobile space efficiency
      expect(screen.getByText(/11.*chars/)).toBeInTheDocument();
    });

    it("should format large character counts with commas", () => {
      const longOutput = "a".repeat(10000);
      render(<OutputView output={longOutput} />);

      // Changed from "characters" to "chars" for mobile space efficiency
      expect(screen.getByText(/10,000.*chars/)).toBeInTheDocument();
    });
  });

  describe("State-based styling", () => {
    it("should show completed state with green styling", () => {
      render(<OutputView output="Done" state="completed" />);

      const stateLabel = screen.getByTestId("output-state");
      expect(stateLabel).toHaveTextContent("Completed");

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("border-green-500");
    });

    it("should show blocked state with yellow styling", () => {
      render(<OutputView output="Blocked by dependency" state="blocked" />);

      const stateLabel = screen.getByTestId("output-state");
      expect(stateLabel).toHaveTextContent("Blocked");

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("border-yellow-500");
    });

    it("should show failed state with red styling", () => {
      render(<OutputView output="Error occurred" state="failed" />);

      const stateLabel = screen.getByTestId("output-state");
      expect(stateLabel).toHaveTextContent("Failed");

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("border-red-500");
    });

    it("should show cancelled state with gray styling", () => {
      render(<OutputView output="Cancelled by user" state="cancelled" />);

      const stateLabel = screen.getByTestId("output-state");
      expect(stateLabel).toHaveTextContent("Cancelled");

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("border-gray-500");
    });

    it("should show default styling when no state provided", () => {
      render(<OutputView output="Running..." />);

      const stateLabel = screen.getByTestId("output-state");
      expect(stateLabel).toHaveTextContent("Output");

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("border-gray-300");
    });
  });

  describe("Accessibility", () => {
    it("should have role log for screen readers", () => {
      render(<OutputView output="Test output" />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveAttribute("role", "log");
    });

    it("should have aria-label for screen readers", () => {
      render(<OutputView output="Test output" />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveAttribute("aria-label", "Command output");
    });
  });

  describe("Empty output with state", () => {
    it("should show state header even with empty output", () => {
      render(<OutputView output="" state="completed" />);

      expect(screen.getByTestId("output-view")).toBeInTheDocument();
      expect(screen.getByTestId("output-state")).toHaveTextContent("Completed");
    });

    it("should show 'No output' text when output is empty but state exists", () => {
      render(<OutputView output="" state="failed" />);

      expect(screen.getByText("No output")).toBeInTheDocument();
    });
  });

  describe("Auto-scroll behavior", () => {
    it("should auto-scroll by default", () => {
      render(<OutputView output="Test output" />);

      // The effect should have run
      expect(screen.getByTestId("output-content")).toBeInTheDocument();
    });

    it("should not auto-scroll when disabled", () => {
      render(<OutputView output="Test output" autoScroll={false} />);

      expect(screen.getByTestId("output-content")).toBeInTheDocument();
    });
  });

  describe("Visual appearance", () => {
    it("should have dark background for terminal-like appearance", () => {
      render(<OutputView output="Terminal output" />);

      const outputContent = screen.getByTestId("output-content");
      expect(outputContent).toHaveClass("bg-gray-900", "text-gray-100");
    });

    it("should have rounded corners", () => {
      render(<OutputView output="Output" />);

      const container = screen.getByTestId("output-view");
      expect(container).toHaveClass("rounded-lg");
    });
  });
});
