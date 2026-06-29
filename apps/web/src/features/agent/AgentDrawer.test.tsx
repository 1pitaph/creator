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
  evidence: [
    "7 日转粉率 0.4%",
    "新增粉丝 5,180",
    "主要受众：短剧付费用户、题材尝鲜用户、团队选题成员",
  ],
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

    const details = screen.getByTestId("agent-context-details");

    expect(screen.getByText("当前询问模块")).toBeInTheDocument();
    expect(screen.getByText("AI 诊断优先级")).toBeInTheDocument();
    expect(details).toHaveAttribute("data-state", "collapsed");
    expect(details).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText(focusTarget.summary)).not.toBeInTheDocument();
    expect(screen.queryByText("7 日转粉率 0.4%")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /下一条视频拍什么/ }),
    ).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "展开当前询问模块" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", details.id);
  });

  it("toggles focused module details and preset questions", () => {
    const onAskPreset = vi.fn();

    renderAgentDrawer({ focus: focusTarget, onAskPreset });

    fireEvent.click(screen.getByRole("button", { name: "展开当前询问模块" }));

    const details = screen.getByTestId("agent-context-details");
    const revealItems = screen.getAllByTestId("agent-context-reveal-item");

    expect(details).toHaveAttribute("data-state", "expanded");
    expect(details).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText(focusTarget.summary)).toBeInTheDocument();
    expect(screen.getByText("7 日转粉率 0.4%")).toBeInTheDocument();
    expect(screen.getByText(focusTarget.evidence[2]!)).toHaveClass(
      "max-w-full",
      "rounded-lg",
      "whitespace-normal",
      "break-words",
    );
    expect(revealItems.map((item) => item.dataset.revealIndex)).toEqual([
      "0",
      "1",
      "2",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /下一条视频拍什么/ }));

    expect(onAskPreset).toHaveBeenCalledWith("下一条视频拍什么？");
    expect(
      screen.getByRole("button", { name: "收起当前询问模块" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "收起当前询问模块" }));

    expect(details).toHaveAttribute("data-state", "collapsed");
    expect(details).toHaveAttribute("aria-hidden", "true");
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
    expect(screen.getByTestId("agent-context-details")).toHaveAttribute(
      "data-state",
      "collapsed",
    );
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

    expect(drawer).toHaveClass("agent-drawer-content", "scroll-isolated");
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

  it("prevents drawer wheel gestures from scrolling the page outside the panel", async () => {
    renderAgentDrawer({ focus: focusTarget });

    const drawer = screen.getByTestId("agent-drawer-content");

    await waitFor(() => {
      const wheelEvent = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 80,
      });

      drawer.dispatchEvent(wheelEvent);

      expect(wheelEvent.defaultPrevented).toBe(true);
    });
  });

  it("keeps wheel scrolling available inside the message viewport", async () => {
    renderAgentDrawer({
      messages: Array.from({ length: 6 }, (_, index) => ({
        id: `message-${index}`,
        role: "assistant" as const,
        content: `回答内容 ${index}`,
      })),
    });

    const viewport = screen.getByTestId("agent-thread-viewport");

    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(viewport, "scrollHeight", {
      configurable: true,
      value: 320,
    });
    viewport.scrollTop = 80;

    await waitFor(() => {
      const wheelEvent = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 80,
      });

      viewport.dispatchEvent(wheelEvent);

      expect(wheelEvent.defaultPrevented).toBe(false);
    });
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
