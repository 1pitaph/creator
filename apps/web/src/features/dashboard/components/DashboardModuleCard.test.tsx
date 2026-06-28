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

    const askButton = screen.getByLabelText("询问 AI Agent：AI 诊断摘要");
    const heading = screen.getByRole("heading", { name: "AI 诊断摘要" });
    const header = heading.parentElement;
    const description = screen.getByText("摘要");
    const content = screen.getByText("内容").parentElement;

    expect(askButton).toHaveClass("h-[34px]");
    expect(header).toHaveClass("!py-4", "!pl-5", "!pr-16");
    expect(header).not.toHaveClass("!py-5", "!pl-6", "!pr-28");
    expect(description).toHaveClass("line-clamp-1");
    expect(content).toHaveClass("!px-5", "!py-4");
    expect(content).not.toHaveClass("!px-6", "!py-5");

    fireEvent.click(askButton);

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
    expect(handle).toHaveClass("left-0");
    expect(handle).toHaveClass("top-3");
    expect(handle).toHaveClass("-translate-x-1/2");
    expect(handle).toHaveClass("z-30");
    expect(handle).toHaveClass("h-[34px]");
    expect(handle).toHaveClass("w-[34px]");
    expect(handle).toHaveClass("bg-[#ececf0]");
    expect(handle).toHaveClass("text-zinc-500");
    expect(handle).toHaveClass("shadow-[0_4px_12px_rgba(24,24,27,0.12)]");
    expect(handle).toHaveClass("hover:bg-zinc-200/100");
    expect(handle).toHaveClass("hover:shadow-[0_7px_18px_rgba(24,24,27,0.16)]");
    expect(handle).toHaveClass("opacity-0");
    expect(handle).toHaveClass("group-hover:opacity-100");
    expect(handle).toHaveClass("group-focus-within:opacity-100");
    expect(handle).toHaveClass("cursor-grab");
    expect(handle).toHaveClass("touch-none");
    expect(handle).toHaveAttribute("data-dashboard-card-drag-handle", "true");
    expect(handle.querySelector("svg")).toHaveClass("h-6", "w-6");

    const heading = screen.getByRole("heading", { name: "AI 诊断摘要" });
    const header = heading.parentElement;

    expect(header).toHaveClass("!pl-5");
    expect(header).not.toHaveClass("!pl-6");
    expect(header).not.toHaveClass("!pl-14");

    fireEvent.pointerDown(handle);

    expect(onDragHandlePointerDown).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("询问 AI Agent：AI 诊断摘要"));

    expect(onAsk).toHaveBeenCalledWith(target);
  });

  it("keeps small card spacing compact and hides descriptions", () => {
    render(
      <DashboardModuleCard title="播放量" description="7 日播放量" askTarget={target} onAsk={vi.fn()} size="small">
        <p>内容</p>
      </DashboardModuleCard>
    );

    const heading = screen.getByRole("heading", { name: "播放量" });
    const header = heading.parentElement;
    const content = screen.getByText("内容").parentElement;

    expect(header).toHaveClass("!py-3", "!pl-4", "!pr-16");
    expect(heading).toHaveClass("truncate", "text-[13px]");
    expect(screen.queryByText("7 日播放量")).not.toBeInTheDocument();
    expect(content).toHaveClass("!px-4", "!py-3");
  });

  it("allows large card descriptions to use two compact lines", () => {
    render(
      <DashboardModuleCard title="AI 诊断摘要" description="基于创作者画像、近 7 日数据和动态模块生成的优先级判断。" askTarget={target} onAsk={vi.fn()} size="large">
        <p>内容</p>
      </DashboardModuleCard>
    );

    expect(screen.getByText("基于创作者画像、近 7 日数据和动态模块生成的优先级判断。")).toHaveClass("line-clamp-2");
  });
});
