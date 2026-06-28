import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { AgentDrawer } from "./AgentDrawer";

const diagnosis = localDiagnosis(defaultCreatorId);
const moduleById = new Map(
  diagnosis.modules.map((module) => [module.id, module]),
);

describe("AgentDrawer", () => {
  it("renders used module badges and disables empty submit", () => {
    renderAgentDrawer({
      messages: [
        {
          id: "assistant",
          role: "assistant",
          content: "回答内容",
          usedModules: [diagnosis.modules[0]!.id],
          mode: "mock",
        },
      ],
    });

    expect(screen.getByText(diagnosis.modules[0]!.name)).toBeInTheDocument();
    expect(screen.getByLabelText("发送消息")).toBeDisabled();
  });

  it("submits composer text through the assistant-ui runtime", async () => {
    const onSendMessage = vi.fn();

    renderAgentDrawer({ onSendMessage });

    fireEvent.change(screen.getByPlaceholderText("围绕当前模块继续追问..."), {
      target: { value: "继续分析选题" },
    });
    fireEvent.click(screen.getByLabelText("发送消息"));

    await waitFor(() =>
      expect(onSendMessage).toHaveBeenCalledWith("继续分析选题"),
    );
  });

  it("passes preset questions back to the container", () => {
    const onAskPreset = vi.fn();

    renderAgentDrawer({ onAskPreset });

    fireEvent.click(screen.getByRole("button", { name: /下一条视频拍什么/ }));

    expect(onAskPreset).toHaveBeenCalledWith("下一条视频拍什么？");
  });

  it("renders approval controls", () => {
    const onApproveApproval = vi.fn();
    const onDenyApproval = vi.fn();

    renderAgentDrawer({
      approval: {
        id: "approval-1",
        threadId: "thread-1",
        actionIds: ["action-1"],
        title: "确认写入行动计划",
        detail: "将 1 条建议写入当前创作者的行动计划。",
        createdAt: "2026-06-28T00:00:00.000Z",
      },
      onApproveApproval,
      onDenyApproval,
    });

    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    fireEvent.click(screen.getByRole("button", { name: "拒绝" }));

    expect(onApproveApproval).toHaveBeenCalledTimes(1);
    expect(onDenyApproval).toHaveBeenCalledTimes(1);
  });

  it("shows a stop control while the stream is active", () => {
    const onStopGeneration = vi.fn();

    renderAgentDrawer({ isChatting: true, onStopGeneration });

    fireEvent.click(screen.getByRole("button", { name: "停止生成" }));

    expect(onStopGeneration).toHaveBeenCalledTimes(1);
  });

  it("closes through Radix dialog escape handling", async () => {
    const onClose = vi.fn();

    renderAgentDrawer({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

type AgentDrawerOverrides = Partial<Parameters<typeof AgentDrawer>[0]>;

const renderAgentDrawer = (overrides: AgentDrawerOverrides = {}) =>
  render(
    <AgentDrawer
      open
      onClose={vi.fn()}
      messages={[]}
      isChatting={false}
      onSendMessage={vi.fn()}
      onAskPreset={vi.fn()}
      onStopGeneration={vi.fn()}
      onApproveApproval={vi.fn()}
      onDenyApproval={vi.fn()}
      isResumingApproval={false}
      moduleById={moduleById}
      focus={null}
      {...overrides}
    />,
  );
