import { createStructuredAgentRun } from "@creator/data-agent";
import type { AgentApprovalRequest } from "@creator/data-contracts";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageChunk,
} from "ai";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { useAgentChat } from "./useAgentChat";

const createIdFactory = () => {
  let index = 0;
  return () => `id-${++index}`;
};

const createStreamResponse = (chunks: UIMessageChunk[]) =>
  createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        chunks.forEach((chunk) => writer.write(chunk));
      },
    }),
  });

const requestBody = (fetchImpl: ReturnType<typeof vi.fn>) => {
  const init = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as {
    activeModules: string[];
    creatorId: string;
    messages: Array<{ role: string; content: string; localOnly?: boolean }>;
    threadId: string;
  };
};

describe("useAgentChat", () => {
  it("uses AI SDK transport, filters local-only messages, and appends the streamed reply", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const agentRun = createStructuredAgentRun({
      diagnosis,
      messages: [{ role: "user", content: "帮我分析完播率" }],
      activeModules: ["content-diagnosis"],
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      createStreamResponse([
        {
          type: "start",
          messageMetadata: {
            threadId: "thread-1",
            mode: "mock",
            usedModules: ["content-diagnosis"],
          },
        },
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "建议先重写前 3 秒。" },
        { type: "text-end", id: "text-1" },
        { type: "data-agent-run", id: agentRun.id, data: agentRun },
        {
          type: "finish",
          finishReason: "stop",
          messageMetadata: {
            agentRunId: agentRun.id,
            threadId: "thread-1",
            mode: "mock",
            usedModules: ["content-diagnosis"],
          },
        },
      ] as UIMessageChunk[]),
    );

    const { result } = renderHook(() =>
      useAgentChat({
        activeModuleIds: diagnosis.modules.map((module) => module.id),
        creatorId: defaultCreatorId,
        diagnosis,
        fetchImpl,
        idFactory: createIdFactory(),
      }),
    );

    act(() => {
      result.current.askTarget({
        title: "完播率",
        prompt: "帮我分析完播率",
        moduleId: "content-diagnosis",
      });
    });

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchImpl)).toMatchObject({
      creatorId: defaultCreatorId,
      activeModules: ["content-diagnosis"],
      messages: [{ role: "user", content: "帮我分析完播率" }],
    });

    await waitFor(() =>
      expect(result.current.messages.at(-1)?.content).toBe(
        "建议先重写前 3 秒。",
      ),
    );
    expect(result.current.messages.at(-1)?.mode).toBe("mock");
    expect(result.current.messages.at(-1)?.agentRun?.id).toBe(agentRun.id);
  });

  it("uses the local fallback reply when chat transport fails", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() =>
      useAgentChat({
        activeModuleIds: diagnosis.modules.map((module) => module.id),
        creatorId: defaultCreatorId,
        diagnosis,
        fetchImpl,
        idFactory: createIdFactory(),
      }),
    );

    act(() => {
      result.current.askTarget({
        title: "粉丝经营诊断",
        prompt: "为什么最近转粉变低？",
        moduleId: "fan-operation",
      });
    });

    const latestAssistantRun = () =>
      result.current.messages
        .slice()
        .reverse()
        .find((message) => message.role === "assistant" && message.agentRun);

    await waitFor(() => expect(latestAssistantRun()?.mode).toBe("local"));
    const fallback = latestAssistantRun();
    expect(fallback?.content).toContain("本次调用模块");
    expect(fallback?.notice?.label).toContain("云端 AI 暂不可用");
    expect(fallback?.agentRun?.toolCalls.length).toBeGreaterThan(0);
  });

  it("resets thread state after creator changes", async () => {
    const firstDiagnosis = localDiagnosis(defaultCreatorId);
    const secondDiagnosis = localDiagnosis("growth-review");
    const fetchImpl = vi.fn().mockResolvedValue(
      createStreamResponse([
        {
          type: "start",
          messageMetadata: { threadId: "thread-1", mode: "mock" },
        },
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "旧账号回复不应该出现" },
        { type: "text-end", id: "text-1" },
        {
          type: "finish",
          finishReason: "stop",
          messageMetadata: { threadId: "thread-1", mode: "mock" },
        },
      ] as UIMessageChunk[]),
    );

    const { result, rerender } = renderHook(
      ({ creatorId, diagnosis }) =>
        useAgentChat({
          activeModuleIds: diagnosis.modules.map((module) => module.id),
          creatorId,
          diagnosis,
          fetchImpl,
          idFactory: createIdFactory(),
        }),
      {
        initialProps: {
          creatorId: defaultCreatorId,
          diagnosis: firstDiagnosis,
        },
      },
    );
    const firstThreadId = result.current.threadId;

    rerender({
      creatorId: secondDiagnosis.creator.id,
      diagnosis: secondDiagnosis,
    });

    await waitFor(() =>
      expect(result.current.threadId).not.toBe(firstThreadId),
    );
    expect(
      result.current.messages.some((message) =>
        message.content.includes("旧账号回复不应该出现"),
      ),
    ).toBe(false);
    expect(result.current.messages.at(0)?.content).toContain(
      secondDiagnosis.creator.displayName,
    );
  });

  it("calls resume approval endpoint once and hides resolved approvals", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const approval: AgentApprovalRequest = {
      id: "approval-1",
      threadId: "thread-1",
      actionIds: ["action-1"],
      title: "确认写入行动计划",
      detail: "将建议写入行动计划。",
      createdAt: "2026-06-28T00:00:00.000Z",
    };
    const resumeFetcher = vi.fn().mockResolvedValue({
      threadId: approval.threadId,
      status: "completed",
      agentRun: createStructuredAgentRun({
        diagnosis,
        messages: [{ role: "assistant", content: "已确认" }],
        activeModules: [],
      }),
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      createStreamResponse([
        {
          type: "start",
          messageMetadata: { threadId: approval.threadId, mode: "mock" },
        },
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "需要确认。" },
        { type: "text-end", id: "text-1" },
        { type: "data-agent-approval", id: approval.id, data: approval },
        {
          type: "finish",
          finishReason: "stop",
          messageMetadata: { threadId: approval.threadId, mode: "mock" },
        },
      ] as UIMessageChunk[]),
    );

    const { result } = renderHook(() =>
      useAgentChat({
        activeModuleIds: diagnosis.modules.map((module) => module.id),
        creatorId: defaultCreatorId,
        diagnosis,
        fetchImpl,
        idFactory: createIdFactory(),
        resumeFetcher,
      }),
    );

    act(() => {
      result.current.askPreset("把建议写入行动计划");
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() =>
      expect(result.current.currentApproval?.id).toBe(approval.id),
    );

    await act(async () => {
      await result.current.approveApproval();
    });

    expect(resumeFetcher).toHaveBeenCalledWith({
      threadId: approval.threadId,
      approvalId: approval.id,
      decision: "approve",
    });

    await waitFor(() => expect(result.current.currentApproval).toBeUndefined());

    await act(async () => {
      await result.current.denyApproval();
    });

    expect(resumeFetcher).toHaveBeenCalledTimes(1);
  });
});
