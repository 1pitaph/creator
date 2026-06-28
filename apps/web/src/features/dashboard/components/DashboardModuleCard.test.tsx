import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardModuleCard } from "./DashboardModuleCard";

const target = {
  title: "AI 诊断摘要",
  prompt: "请总结当前最重要的问题"
};

describe("DashboardModuleCard", () => {
  it("calls onAsk with its target", () => {
    const onAsk = vi.fn();

    render(
      <DashboardModuleCard title="AI 诊断摘要" description="摘要" askTarget={target} onAsk={onAsk}>
        <p>内容</p>
      </DashboardModuleCard>
    );

    fireEvent.click(screen.getByLabelText("询问 AI Agent：AI 诊断摘要"));

    expect(onAsk).toHaveBeenCalledWith(target);
  });

  it("does not render a drag handle by default", () => {
    render(
      <DashboardModuleCard title="AI 诊断摘要" description="摘要" askTarget={target} onAsk={vi.fn()}>
        <p>内容</p>
      </DashboardModuleCard>
    );

    expect(screen.queryByLabelText("拖动卡片：AI 诊断摘要")).not.toBeInTheDocument();
  });

  it("renders a six-dot drag handle when enabled without blocking the ask button", () => {
    const onAsk = vi.fn();
    const onDragHandlePointerDown = vi.fn();

    render(
      <DashboardModuleCard
        title="AI 诊断摘要"
        description="摘要"
        askTarget={target}
        onAsk={onAsk}
        onDragHandlePointerDown={onDragHandlePointerDown}
        showDragHandle
      >
        <p>内容</p>
      </DashboardModuleCard>
    );

    const handle = screen.getByLabelText("拖动卡片：AI 诊断摘要");

    expect(handle).toHaveClass("dashboard-card-drag-handle");
    expect(handle).toHaveAttribute("data-dashboard-card-drag-handle", "true");

    fireEvent.pointerDown(handle);

    expect(onDragHandlePointerDown).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("询问 AI Agent：AI 诊断摘要"));

    expect(onAsk).toHaveBeenCalledWith(target);
  });
});
