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
  });

  it("shows pending approval status", () => {
    render(
      <AgentFloatingButton hasPendingApproval open={false} onOpen={vi.fn()} />,
    );

    expect(screen.getByText("有操作等待确认")).toBeInTheDocument();
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
  });
});
