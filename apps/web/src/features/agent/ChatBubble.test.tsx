import { createStructuredAgentRun } from "@creator/data-agent";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { localDiagnosis } from "../creator-diagnosis/api";
import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { ChatBubble } from "./ChatBubble";

describe("ChatBubble", () => {
  it("renders assistant markdown content", async () => {
    render(
      <ChatBubble
        message={{
          id: "message-markdown",
          role: "assistant",
          content:
            "# 短剧热度研究室\n\n## 核心问题判断\n\n你的账号**增长诊断**已完成。\n\n- 播放健康\n- 转粉偏低",
        }}
        moduleById={new Map()}
      />,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "短剧热度研究室" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "核心问题判断" }),
    ).toBeInTheDocument();
    expect(screen.getByText("增长诊断").tagName).toBe("STRONG");
    expect(screen.getByText("播放健康").closest("li")).not.toBeNull();
    expect(screen.getByText("转粉偏低").closest("li")).not.toBeNull();
  });

  it("keeps user messages as plain text", () => {
    render(
      <ChatBubble
        message={{
          id: "message-user-markdown",
          role: "user",
          content: "# 这不是标题\n\n**这不是强调**",
        }}
        moduleById={new Map()}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "这不是标题" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          element?.tagName === "P" &&
          element.textContent === "# 这不是标题\n\n**这不是强调**",
      ),
    ).toBeInTheDocument();
  });

  it("shows tool error status inside the AgentRun audit panel", () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const agentRun = createStructuredAgentRun({
      diagnosis,
      messages: [{ role: "user", content: "为什么完播率不好？" }],
      activeModules: ["content-diagnosis"],
    });

    render(
      <ChatBubble
        message={{
          id: "message-1",
          role: "assistant",
          content: "这里是诊断结果。",
          agentRun: {
            ...agentRun,
            toolCalls: [
              {
                id: "tool-error",
                name: "profile_dataset",
                status: "error",
                inputSummary: "读取数据概况",
                outputSummary: "读取失败。",
                evidenceIds: [],
                error: "Kernel unavailable.",
              },
            ],
          },
        }}
        moduleById={new Map()}
      />,
    );

    expect(screen.getByText("工具调用")).toBeInTheDocument();
    expect(screen.getByText("profile_dataset · 失败")).toHaveAttribute(
      "title",
      "Kernel unavailable.",
    );
  });

  it("shows compact live tool calls before the final AgentRun arrives", () => {
    render(
      <ChatBubble
        message={{
          id: "message-live-tools",
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "kernel-1",
              name: "profile_dataset",
              status: "running",
              inputSummary: "读取数据概况",
              evidenceIds: [],
            },
            {
              id: "kernel-2",
              name: "create_chart_data",
              status: "success",
              inputSummary: "生成图表数据",
              outputSummary: "图表数据完成。",
              evidenceIds: [],
            },
          ],
        }}
        moduleById={new Map()}
      />,
    );

    expect(screen.getByText("工具调用")).toBeInTheDocument();
    expect(screen.getByText("profile_dataset · 运行中")).toBeInTheDocument();
    expect(screen.getByText("create_chart_data · 完成")).toBeInTheDocument();
  });

  it("prefers the final AgentRun audit panel over live tool calls", () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const agentRun = createStructuredAgentRun({
      diagnosis,
      messages: [{ role: "user", content: "为什么完播率不好？" }],
      activeModules: ["content-diagnosis"],
    });

    render(
      <ChatBubble
        message={{
          id: "message-final-tools",
          role: "assistant",
          content: "这里是诊断结果。",
          toolCalls: [
            {
              id: "kernel-live",
              name: "profile_dataset",
              status: "running",
              inputSummary: "读取数据概况",
              evidenceIds: [],
            },
          ],
          agentRun,
        }}
        moduleById={new Map()}
      />,
    );

    expect(screen.queryByText("profile_dataset · 运行中")).toBeNull();
    expect(screen.getByText("load_creator_context · 完成")).toBeInTheDocument();
  });

  it("shows degraded mode notices above assistant content", () => {
    render(
      <ChatBubble
        message={{
          id: "message-notice",
          role: "assistant",
          content: "这里是本地诊断。",
          notice: {
            label: "云端 AI 暂不可用，已切换为本地诊断结果。",
            tone: "warning",
          },
        }}
        moduleById={new Map()}
      />,
    );

    expect(
      screen.getByText("云端 AI 暂不可用，已切换为本地诊断结果。"),
    ).toBeInTheDocument();
  });
});
