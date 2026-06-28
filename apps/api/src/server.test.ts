import type { FastifyInstance } from "fastify";
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

beforeEach(async () => {
  vi.stubEnv("AGENT_CHECKPOINT_URL", "");
  vi.stubEnv("DATA_KERNEL_URL", "");
  vi.stubEnv("LLM_API_KEY", "");
  app = await buildApiApp();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

describe("creator API", () => {
  it("keeps /api/chat legacy JSON response shape while invoking the graph", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        creatorId: "starter-food",
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
        creatorId: "starter-food",
        threadId: "thread-stream",
        activeModules: ["topic-opportunity"],
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
  });

  it("streams approval requests for side-effect actions", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "starter-food",
        threadId: "thread-stream-approval",
        activeModules: ["topic-opportunity"],
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
          creatorId: "starter-food",
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

  it("resumes approvals", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/resume",
      payload: {
        threadId: "thread-approval",
        approvalId: "approval-1",
        decision: "deny",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.agentRun.answer).toContain("已拒绝");
  });

  it("rejects invalid chat, stream, and resume payloads", async () => {
    const chat = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        creatorId: "starter-food",
        messages: "bad",
      },
    });
    const stream = await app.inject({
      method: "POST",
      url: "/api/chat/stream",
      payload: {
        creatorId: "starter-food",
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
