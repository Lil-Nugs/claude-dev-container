import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActionBar } from "../../src/components/ActionBar";

describe("ActionBar", () => {
  const defaultProps = {
    hasProject: true,
    hasBead: true,
    isExecuting: false,
    onWork: vi.fn(),
    onReview: vi.fn(),
    onPushPR: vi.fn(),
    onTerminal: vi.fn(),
  };

  describe("data-testid attributes", () => {
    it("should have action-terminal data-testid", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-terminal")).toBeInTheDocument();
    });

    it("should have action-work data-testid", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-work")).toBeInTheDocument();
    });

    it("should have action-review data-testid", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-review")).toBeInTheDocument();
    });

    it("should have action-push-pr data-testid", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-push-pr")).toBeInTheDocument();
    });

    it("should have action-refresh data-testid when executing", () => {
      const onRefresh = vi.fn();
      render(
        <ActionBar {...defaultProps} isExecuting={true} onRefresh={onRefresh} />
      );
      expect(screen.getByTestId("action-refresh")).toBeInTheDocument();
    });
  });

  describe("button states", () => {
    it("should disable work button when no bead selected", () => {
      render(<ActionBar {...defaultProps} hasBead={false} />);
      expect(screen.getByTestId("action-work")).toBeDisabled();
    });

    it("should disable work button when no project selected", () => {
      render(<ActionBar {...defaultProps} hasProject={false} />);
      expect(screen.getByTestId("action-work")).toBeDisabled();
    });

    it("should disable all action buttons when executing", () => {
      render(<ActionBar {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId("action-work")).toBeDisabled();
      expect(screen.getByTestId("action-review")).toBeDisabled();
      expect(screen.getByTestId("action-push-pr")).toBeDisabled();
    });

    it("should disable terminal when no project selected", () => {
      render(<ActionBar {...defaultProps} hasProject={false} />);
      expect(screen.getByTestId("action-terminal")).toBeDisabled();
    });

    it("should enable review when project is selected (no bead needed)", () => {
      render(<ActionBar {...defaultProps} hasBead={false} />);
      expect(screen.getByTestId("action-review")).not.toBeDisabled();
    });
  });

  describe("button callbacks", () => {
    it("should call onWork when work button clicked", () => {
      const onWork = vi.fn();
      render(<ActionBar {...defaultProps} onWork={onWork} />);
      fireEvent.click(screen.getByTestId("action-work"));
      expect(onWork).toHaveBeenCalled();
    });

    it("should call onReview when review button clicked", () => {
      const onReview = vi.fn();
      render(<ActionBar {...defaultProps} onReview={onReview} />);
      fireEvent.click(screen.getByTestId("action-review"));
      expect(onReview).toHaveBeenCalled();
    });

    it("should call onPushPR when push/PR button clicked", () => {
      const onPushPR = vi.fn();
      render(<ActionBar {...defaultProps} onPushPR={onPushPR} />);
      fireEvent.click(screen.getByTestId("action-push-pr"));
      expect(onPushPR).toHaveBeenCalled();
    });

    it("should call onTerminal when terminal button clicked", () => {
      const onTerminal = vi.fn();
      render(<ActionBar {...defaultProps} onTerminal={onTerminal} />);
      fireEvent.click(screen.getByTestId("action-terminal"));
      expect(onTerminal).toHaveBeenCalled();
    });

    it("should call onRefresh when refresh button clicked", () => {
      const onRefresh = vi.fn();
      render(
        <ActionBar {...defaultProps} isExecuting={true} onRefresh={onRefresh} />
      );
      fireEvent.click(screen.getByTestId("action-refresh"));
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("elapsed time display", () => {
    it("should show elapsed time when executing work", () => {
      render(
        <ActionBar
          {...defaultProps}
          isExecuting={true}
          currentAction="work"
          elapsedTime={65}
        />
      );
      expect(screen.getByTestId("action-work")).toHaveTextContent("1:05");
      expect(screen.getByTestId("action-work")).toHaveTextContent("Working...");
    });

    it("should show elapsed time when executing review", () => {
      render(
        <ActionBar
          {...defaultProps}
          isExecuting={true}
          currentAction="review"
          elapsedTime={120}
        />
      );
      expect(screen.getByTestId("action-review")).toHaveTextContent("2:00");
      expect(screen.getByTestId("action-review")).toHaveTextContent(
        "Reviewing..."
      );
    });

    it("should show elapsed time when executing push-pr", () => {
      render(
        <ActionBar
          {...defaultProps}
          isExecuting={true}
          currentAction="push-pr"
          elapsedTime={30}
        />
      );
      expect(screen.getByTestId("action-push-pr")).toHaveTextContent("0:30");
      expect(screen.getByTestId("action-push-pr")).toHaveTextContent(
        "Pushing..."
      );
    });
  });

  describe("accessibility", () => {
    it("should have aria-label on terminal button", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-terminal")).toHaveAttribute(
        "aria-label",
        "Open terminal"
      );
    });

    it("should have aria-label on work button", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-work")).toHaveAttribute(
        "aria-label",
        "Run work on selected bead"
      );
    });

    it("should have aria-label on review button", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-review")).toHaveAttribute(
        "aria-label",
        "Run review"
      );
    });

    it("should have aria-label on push-pr button", () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId("action-push-pr")).toHaveAttribute(
        "aria-label",
        "Push and create PR"
      );
    });
  });
});
