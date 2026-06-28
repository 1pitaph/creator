import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentFloatingButton } from "./AgentFloatingButton";

describe("AgentFloatingButton", () => {
  it("opens the agent from the customer-support style launcher", () => {
    const onOpen = vi.fn();

    render(<AgentFloatingButton open={false} onOpen={onOpen} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "打开 AI Agent，随时唤起数据助手",
      }),
    );

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByText("随时唤起数据助手")).toBeInTheDocument();
    expect(screen.getByTestId("agent-floating-icon")).toBeInTheDocument();
  });

  it("shows pending approval status", () => {
    render(
      <AgentFloatingButton hasPendingApproval open={false} onOpen={vi.fn()} />,
    );

    expect(screen.getByText("有操作等待确认")).toBeInTheDocument();
  });

  it("renders a circular dashed anchor ring behind the magnetic button", () => {
    render(<AgentFloatingButton open={false} onOpen={vi.fn()} />);

    const ring = screen.getByTestId("agent-floating-ring");
    const button = screen.getByTestId("agent-floating-button");

    expect(ring).toHaveClass(
      "pointer-events-none",
      "inset-0",
      "rounded-full",
      "border",
      "border-dashed",
    );
    expect(ring).not.toHaveClass(
      "border-t",
      "h-px",
      "w-11",
      "top-[calc(100%+0.35rem)]",
    );
    expect(button.parentElement?.parentElement).toContainElement(ring);
    expect(button.parentElement).not.toContainElement(ring);
  });

  it("collapses the launcher while the drawer is open", () => {
    render(<AgentFloatingButton open onOpen={vi.fn()} />);

    expect(screen.getByTestId("agent-floating-button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("agent-floating-button")).toHaveClass(
      "opacity-0",
    );
    expect(screen.getByTestId("agent-floating-ring")).toHaveClass("opacity-0");
  });
});
