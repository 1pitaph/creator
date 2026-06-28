import { describe, expect, it } from "vitest";

import {
  AgentCheckpointSchema,
  AgentResumeRequestSchema,
  AgentRunPatchSchema,
  AgentRunSchema,
  AgentStreamEventSchema,
  AgentToolResultSchema,
  ChatResponseSchema,
  DataKernelRequestSchema,
  DataKernelResponseSchema,
} from "./index";

const agentRun = AgentRunSchema.parse({
  id: "run-1",
  mode: "deterministic",
  answer: "回答",
  usedModules: ["content-diagnosis"],
  toolCalls: [
    {
      id: "tool-1",
      name: "load_creator_context",
      status: "success",
      inputSummary: "读取上下文",
      outputSummary: "完成",
      evidenceIds: [],
    },
  ],
  evidence: [],
  facts: [],
  assumptions: [],
  actions: [],
  followUpQuestions: [],
  createdAt: "2026-06-28T00:00:00.000Z",
});

const dataset = {
  profile: {
    id: "starter-food",
    handle: "@starter",
    displayName: "Starter",
    domain: "美食",
    lifecycle: "new",
    contentFormats: ["short_video"],
    goals: ["increase_views"],
    bottlenecks: ["完播低"],
    audience: [{ label: "通勤族", percentage: 60, note: "晚间活跃" }],
    creatorHabits: ["周末拍摄"],
    tone: "直接",
  },
  summary: {
    views7d: 100,
    viewsChangePct: 10,
    completionRate: 0.4,
    interactionRate: 0.05,
    followerGain7d: 12,
    followerConversionRate: 0.01,
    publishCount7d: 3,
  },
  history: [
    {
      date: "2026-06-28",
      views: 100,
      completionRate: 0.4,
      interactionRate: 0.05,
      followerConversionRate: 0.01,
      followersGained: 12,
    },
  ],
  topContents: [
    {
      id: "v1",
      title: "内容",
      views: 100,
      completionRate: 0.4,
      interactionRate: 0.05,
      followerConversionRate: 0.01,
      hook: "开头",
      opportunity: "系列化",
    },
  ],
};

describe("data contracts", () => {
  it("parses legacy ChatResponse with AgentRun and thread metadata", () => {
    const parsed = ChatResponseSchema.parse({
      reply: agentRun.answer,
      usedModules: agentRun.usedModules,
      mode: "mock",
      agentRun,
      threadId: "thread-1",
      status: "completed",
      checkpoint: {
        threadId: "thread-1",
        checkpointProvider: "memory",
        status: "completed",
        updatedAt: "2026-06-28T00:00:00.000Z",
      },
    });

    expect(parsed.agentRun?.id).toBe("run-1");
    expect(parsed.threadId).toBe("thread-1");
    expect(parsed.checkpoint?.checkpointProvider).toBe("memory");
  });

  it("parses stream events, patches, tool results, and checkpoint metadata", () => {
    expect(
      AgentRunPatchSchema.parse({ id: "run-1", answer: "delta" }).answer,
    ).toBe("delta");
    expect(
      AgentToolResultSchema.parse({
        toolCallId: "tool-1",
        name: "run_sql",
        status: "success",
      }).evidenceIds,
    ).toEqual([]);
    expect(
      AgentCheckpointSchema.parse({
        threadId: "thread-1",
        checkpointProvider: "memory",
        status: "completed",
        updatedAt: "2026-06-28T00:00:00.000Z",
      }).checkpointProvider,
    ).toBe("memory");
    expect(
      AgentStreamEventSchema.parse({ type: "text-delta", delta: "hi" }).type,
    ).toBe("text-delta");
    expect(
      AgentStreamEventSchema.parse({
        type: "thread",
        threadId: "thread-1",
        status: "running",
        checkpoint: {
          threadId: "thread-1",
          checkpointProvider: "postgres",
          status: "running",
          updatedAt: "2026-06-28T00:00:00.000Z",
        },
      }).checkpoint?.checkpointProvider,
    ).toBe("postgres");
    expect(
      AgentStreamEventSchema.parse({
        type: "tool-result",
        toolResult: {
          toolCallId: "tool-1",
          name: "run_sql",
          status: "success",
        },
      }).type,
    ).toBe("tool-result");
  });

  it("parses kernel request and response defaults", () => {
    const request = DataKernelRequestSchema.parse({
      requestId: "kernel-1",
      tool: "profile_dataset",
      creatorId: "starter-food",
      dataset,
    });
    const response = DataKernelResponseSchema.parse({
      ok: true,
      requestId: "kernel-1",
      tool: "profile_dataset",
    });

    expect(request.limits.maxRows).toBe(200);
    expect(response.evidence).toEqual([]);
  });

  it("accepts nullable fields emitted by the Python data kernel", () => {
    const response = DataKernelResponseSchema.parse({
      ok: true,
      requestId: "kernel-1",
      tool: "profile_dataset",
      evidence: [
        {
          sourceTable: "history",
          rowCount: 7,
          columns: ["date", "views"],
          excerpt: "history has 7 rows.",
          metricKey: null,
        },
      ],
      error: null,
    });

    expect(response.evidence[0]?.metricKey).toBeNull();
    expect(response.error).toBeNull();
  });

  it("rejects kernel limits beyond the Python kernel bounds", () => {
    expect(() =>
      DataKernelRequestSchema.parse({
        requestId: "kernel-1",
        tool: "run_sql",
        creatorId: "starter-food",
        dataset,
        limits: {
          maxRows: 5001,
          maxExecutionMs: 3000,
          maxColumns: 40,
        },
      }),
    ).toThrow();
    expect(() =>
      DataKernelRequestSchema.parse({
        requestId: "kernel-2",
        tool: "run_sql",
        creatorId: "starter-food",
        dataset,
        limits: {
          maxRows: 200,
          maxExecutionMs: 99,
          maxColumns: 40,
        },
      }),
    ).toThrow();
  });

  it("parses approval resume requests", () => {
    expect(
      AgentResumeRequestSchema.parse({
        threadId: "thread-1",
        approvalId: "approval-1",
        decision: "approve",
      }).decision,
    ).toBe("approve");
  });
});
