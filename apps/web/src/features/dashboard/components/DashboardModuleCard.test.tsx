import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardModuleCard } from "./DashboardModuleCard";

describe("DashboardModuleCard", () => {
  it("calls onAsk with its target", () => {
    const target = {
      title: "AI 诊断摘要",
      prompt: "请总结当前最重要的问题"
    };
    const onAsk = vi.fn();

    render(
      <DashboardModuleCard title="AI 诊断摘要" description="摘要" askTarget={target} onAsk={onAsk}>
        <p>内容</p>
      </DashboardModuleCard>
    );

    fireEvent.click(screen.getByLabelText("询问 AI Agent：AI 诊断摘要"));

    expect(onAsk).toHaveBeenCalledWith(target);
  });
});
