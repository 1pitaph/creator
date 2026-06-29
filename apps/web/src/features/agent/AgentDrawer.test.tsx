import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { AgentDrawer } from "./AgentDrawer";

const diagnosis = localDiagnosis(defaultCreatorId);
const moduleById = new Map(
  diagnosis.modules.map((module) => [module.id, module]),
);
const focusTarget = {
  title: "AI 诊断优先级",
  prompt: "诊断增长瓶颈",
  moduleId: "fan-operation",
  summary: "建议把结尾关注理由、主页合集和评论回访做成一套承接链路。",
  evidence: ["7 日转粉率 0.4%", "新增粉丝 5,180"],
};

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

  it("collapses focused module context by default", () => {
    renderAgentDrawer({ focus: focusTarget });

    expect(screen.getByText("当前询问模块")).toBeInTheDocument();
    expect(screen.getByText("AI 诊断优先级")).toBeInTheDocument();
    expect(screen.queryByText(focusTarget.summary)).not.toBeInTheDocument();
    expect(screen.queryByText("7 日转粉率 0.4%")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /下一条视频拍什么/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "展开当前询问模块" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles focused module details and preset questions", () => {
    const onAskPreset = vi.fn();

    renderAgentDrawer({ focus: focusTarget, onAskPreset });

    fireEvent.click(screen.getByRole("button", { name: "展开当前询问模块" }));

    expect(screen.getByText(focusTarget.summary)).toBeInTheDocument();
    expect(screen.getByText("7 日转粉率 0.4%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /下一条视频拍什么/ }));

    expect(onAskPreset).toHaveBeenCalledWith("下一条视频拍什么？");
    expect(
      screen.getByRole("button", { name: "收起当前询问模块" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "收起当前询问模块" }));

    expect(screen.queryByText(focusTarget.summary)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /下一条视频拍什么/ }),
    ).not.toBeInTheDocument();
  });

  it("resets focused module context to collapsed when focus changes", () => {
    const nextFocus = {
      ...focusTarget,
      title: "下一条视频拍什么",
      moduleId: "content-diagnosis",
      summary: "从高完播视频的开头钩子里提炼下一条选题。",
    };
    const view = renderAgentDrawer({ focus: focusTarget });

    fireEvent.click(screen.getByRole("button", { name: "展开当前询问模块" }));

    expect(screen.getByText(focusTarget.summary)).toBeInTheDocument();

    view.rerender(<AgentDrawer {...agentDrawerProps({ focus: nextFocus })} />);

    expect(screen.getByText("下一条视频拍什么")).toBeInTheDocument();
    expect(screen.queryByText(nextFocus.summary)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "展开当前询问模块" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps preset questions visible when no module is focused", () => {
    renderAgentDrawer();

    expect(
      screen.getByRole("button", { name: /下一条视频拍什么/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "展开当前询问模块" }),
    ).not.toBeInTheDocument();
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

  it("binds the drawer content to the bezier animation hook", () => {
    renderAgentDrawer();

    const drawer = screen.getByTestId("agent-drawer-content");

    expect(drawer).toHaveClass("agent-drawer-content");
    expect(drawer).toHaveAttribute("data-state", "open");
  });

  it("uses hover-revealed scrollbar styling for the message viewport", () => {
    renderAgentDrawer();

    expect(screen.getByTestId("agent-thread-viewport")).toHaveClass(
      "hover-scrollbar",
      "scroll-isolated",
      "overflow-y-auto",
    );
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
  render(<AgentDrawer {...agentDrawerProps(overrides)} />);

const agentDrawerProps = (overrides: AgentDrawerOverrides = {}) => ({
  open: true,
  onClose: vi.fn(),
  messages: [],
  isChatting: false,
  onSendMessage: vi.fn(),
  onAskPreset: vi.fn(),
  onStopGeneration: vi.fn(),
  onApproveApproval: vi.fn(),
  onDenyApproval: vi.fn(),
  isResumingApproval: false,
  moduleById,
  focus: null,
  ...overrides,
});
