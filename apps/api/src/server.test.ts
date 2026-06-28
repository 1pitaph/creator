import type { FastifyInstance } from "fastify";
import { resetAgentGraphRuntimeForTests } from "@creator/agent-graph";
import type { DashboardPreferencesV1 } from "@creator/data-contracts";
import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApiApp } from "./server";

let app: FastifyInstance;

const parseSseChunks = (payload: string) =>
  payload
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length).trim())
    .filter((line) => line && line !== "[DONE]")
    .map(
      (line) => JSON.parse(line) as { type: string; [key: string]: unknown },
    );

const withTimeout = async <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);

const createDashboardPreferences = (
  creatorId = "short-drama-strategy",
): DashboardPreferencesV1 => ({
  version: 1,
  creatorId,
  selectedView: "visual",
  updatedAt: "2026-06-28T00:00:00.000Z",
  cards: {
    summary: { visible: true, size: "wide" },
  },
  visual: {
    layouts: {
      lg: [{ i: "summary", x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 }],
      md: [{ i: "summary", x: 0, y: 0, w: 4, h: 6, minW: 2, minH: 4 }],
      sm: [{ i: "summary", x: 0, y: 0, w: 4, h: 6, minW: 2, minH: 4 }],
      xs: [{ i: "summary", x: 0, y: 0, w: 2, h: 6, minW: 2, minH: 4 }],
    },
  },
  board: {
    columns: {
      today: ["action-1"],
      next: [],
      this_week: [],
      done: [],
    },
  },
  table: {
    sort: {
      field: "priority",
      direction: "asc",
    },
  },
});

beforeEach(async () => {
  vi.stubEnv("AGENT_CHECKPOINT_URL", "");
  vi.stubEnv("DATA_KERNEL_URL", "");
  vi.stubEnv("LLM_API_KEY", "");
  resetAgentGraphRuntimeForTests();
  app = await buildApiApp();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

describe("creator API", () => {
  it("returns null when dashboard preferences have not been saved", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/creator/short-drama-strategy/dashboard-preferences",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ preferences: null });
  });

  it("saves and returns dashboard preferences", async () => {
    const preferences = createDashboardPreferences();
    const saved = await app.inject({
      method: "PUT",
      url: "/api/creator/short-drama-strategy/dashboard-preferences",
      payload: preferences,
    });
    const loaded = await app.inject({
      method: "GET",
      url: "/api/creator/short-drama-strategy/dashboard-preferences",
    });

    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toEqual({ preferences });
    expect(loaded.json()).toEqual({ preferences });
  });

  it("rejects invalid dashboard preferences", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/creator/short-drama-strategy/dashboard-preferences",
      payload: {
        ...createDashboardPreferences("other-creator"),
        selectedView: "canvas",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Invalid dashboard preferences");
  });

  it("keeps /api/chat legacy JSON response shape while invoking the graph", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        creatorId: "short-drama-strategy",
        threadId: "thread-json",
        activeModules: ["content-diagnosis"],
        messages: [
          { role: "assistant", content: "local welcome", localOnly: true },
          { role: "user", content: "帮我分析完播率" },
        ],
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      mode: "mock",
      threadId: "thread-json",
      status: "completed",
      usedModules: ["content-diagnosis"],
      checkpoint: {
        checkpointProvider: "memory",
        status: "completed",
        threadId: "thread-json",
      },
    });
    expect(body.reply).toContain("本次调用模块");
    expect(
      body.agentRun.toolCalls.map((tool: { name: string }) => tool.name),
    ).toContain("rank_priority_insight");
  });

  it("streams AI SDK UI message chunks with text, tool status, AgentRun patch, and final AgentRun", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "short-drama-strategy",
        threadId: "thread-stream",
        activeModules: ["viral-review"],
        messages: [{ role: "user", content: "下一条视频拍什么？" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    const chunks = parseSseChunks(response.payload);
    const types = chunks.map((chunk) => chunk.type);

    expect(types).toEqual(
      expect.arrayContaining([
        "start",
        "tool-input-available",
        "tool-output-available",
        "data-agent-run-patch",
        "text-delta",
        "data-agent-run",
        "message-metadata",
        "finish",
      ]),
    );
    expect(types.indexOf("text-start")).toBeLessThan(
      types.indexOf("text-delta"),
    );
    expect(types.indexOf("data-agent-run")).toBeLessThan(
      types.indexOf("finish"),
    );
    expect(
      chunks
        .filter((chunk) => chunk.type === "text-delta")
        .map((chunk) => chunk.delta)
        .join(""),
    ).toContain("本次调用模块");
    expect(
      chunks.find((chunk) => chunk.type === "data-agent-thread")?.data,
    ).toMatchObject({
      checkpoint: {
        checkpointProvider: "memory",
        status: "running",
        threadId: "thread-stream",
      },
    });
  });

  it("streams approval requests for side-effect actions", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "short-drama-strategy",
        threadId: "thread-stream-approval",
        activeModules: ["viral-review"],
        messages: [{ role: "user", content: "把建议写入行动计划" }],
      },
    });
    const chunks = parseSseChunks(response.payload);
    const approval = chunks.find(
      (chunk) => chunk.type === "data-agent-approval",
    );

    expect(response.statusCode).toBe(200);
    expect(approval?.data).toMatchObject({
      threadId: "thread-stream-approval",
      title: "确认写入行动计划",
    });
    expect(
      chunks.find((chunk) => chunk.type === "data-agent-finish")?.data,
    ).toMatchObject({
      status: "awaiting_approval",
    });
  });

  it("streams tool errors when the data kernel reports failures", async () => {
    const kernel = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: false,
          requestId: "kernel-error",
          tool: "profile_dataset",
          error: {
            code: "KERNEL_DOWN",
            message: "Kernel unavailable.",
          },
        }),
      );
    });
    await new Promise<void>((resolve) =>
      kernel.listen(0, "127.0.0.1", resolve),
    );
    const address = kernel.address();

    try {
      if (!address || typeof address === "string") {
        throw new Error("Test kernel did not expose a port.");
      }

      vi.stubEnv("DATA_KERNEL_URL", `http://127.0.0.1:${address.port}`);

      const response = await app.inject({
        method: "POST",
        url: "/api/chat/stream",
        payload: {
          creatorId: "short-drama-strategy",
          threadId: "thread-stream-kernel-error",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "为什么完播率不好？" }],
        },
      });
      const chunks = parseSseChunks(response.payload);

      expect(response.statusCode).toBe(200);
      expect(chunks.map((chunk) => chunk.type)).toContain("tool-output-error");
      expect(
        chunks.find(
          (chunk) =>
            chunk.type === "data-agent-tool-call" &&
            (chunk.data as { name?: string }).name === "profile_dataset",
        )?.data,
      ).toMatchObject({
        status: "error",
        error: "Kernel unavailable.",
      });
    } finally {
      await new Promise<void>((resolve) => kernel.close(() => resolve()));
    }
  });

  it("aborts upstream LLM streams when the client disconnects", async () => {
    let upstreamStartedResolve: (() => void) | undefined;
    let upstreamClosedResolve: (() => void) | undefined;
    const upstreamStarted = new Promise<void>((resolve) => {
      upstreamStartedResolve = resolve;
    });
    const upstreamClosed = new Promise<void>((resolve) => {
      upstreamClosedResolve = resolve;
    });
    const llm = createServer((request, response) => {
      upstreamStartedResolve?.();
      request.on("close", () => upstreamClosedResolve?.());
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      response.write(
        `data: ${JSON.stringify({
          id: "chunk-1",
          object: "chat.completion.chunk",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              delta: { content: "slow " },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
    });
    await new Promise<void>((resolve) =>
      llm.listen(0, "127.0.0.1", resolve),
    );
    const llmAddress = llm.address();
    const apiAddress = await app.listen({ port: 0, host: "127.0.0.1" });

    try {
      if (!llmAddress || typeof llmAddress === "string") {
        throw new Error("Test LLM server did not expose a port.");
      }

      vi.stubEnv("LLM_API_KEY", "test-key");
      vi.stubEnv("LLM_BASE_URL", `http://127.0.0.1:${llmAddress.port}`);
      vi.stubEnv("LLM_MODEL", "test-model");

      const abortController = new AbortController();
      const response = await fetch(`${apiAddress}/api/chat/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId: "short-drama-strategy",
          threadId: "thread-stream-abort",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "帮我分析完播率" }],
        }),
        signal: abortController.signal,
      });

      expect(response.status).toBe(200);
      await withTimeout(upstreamStarted, 5_000);
      abortController.abort();
      await expect(withTimeout(upstreamClosed, 5_000)).resolves.toBeUndefined();
    } finally {
      if (apiAddress) {
        await app.close();
        app = await buildApiApp();
        await app.ready();
      }
      await new Promise<void>((resolve) => llm.close(() => resolve()));
    }
  });

  it("resumes approvals", async () => {
    const pending = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "short-drama-strategy",
        threadId: "thread-approval",
        activeModules: ["viral-review"],
        messages: [{ role: "user", content: "把建议写入行动计划" }],
      },
    });
    const approval = parseSseChunks(pending.payload).find(
      (chunk) => chunk.type === "data-agent-approval",
    )?.data as { id?: string } | undefined;

    expect(approval?.id).toBeTruthy();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/resume",
      payload: {
        threadId: "thread-approval",
        approvalId: approval!.id,
        decision: "deny",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.agentRun.answer).toContain("已拒绝");

    const replay = await app.inject({
      method: "POST",
      url: "/api/chat/resume",
      payload: {
        threadId: "thread-approval",
        approvalId: approval!.id,
        decision: "approve",
      },
    });

    expect(replay.json().status).toBe("error");
  });

  it("rejects invalid chat, stream, and resume payloads", async () => {
    const chat = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        creatorId: "short-drama-strategy",
        messages: "bad",
      },
    });
    const stream = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "short-drama-strategy",
        messages: "bad",
      },
    });
    const resume = await app.inject({
      method: "POST",
      url: "/api/chat/resume",
      payload: {
        threadId: "thread-1",
        approvalId: "approval-1",
        decision: "maybe",
      },
    });

    expect(chat.statusCode).toBe(400);
    expect(stream.statusCode).toBe(400);
    expect(resume.statusCode).toBe(400);
  });
});
