import { createDiagnosis } from "@creator/ai-modules";
import { getMockCreator } from "@creator/mock-data";
import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createServer } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  invokeAgentGraph,
  resetAgentGraphRuntimeForTests,
  resumeAgentGraph,
  streamAgentGraphEvents,
} from "./index";

const diagnosis = () => {
  const creator = getMockCreator("starter-food");

  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics,
  });
};

beforeEach(() => {
  resetAgentGraphRuntimeForTests();
  vi.stubEnv("AGENT_CHECKPOINT_URL", "");
  vi.stubEnv("DATA_KERNEL_URL", "");
  vi.stubEnv("LLM_API_KEY", "");
});

describe("agent graph", () => {
  it("invokes the LangGraph runner with module filtering and memory checkpoint fallback", async () => {
    const result = await invokeAgentGraph({
      diagnosis: diagnosis(),
      request: {
        creatorId: "starter-food",
        threadId: "thread-test",
        activeModules: ["content-diagnosis"],
        messages: [
          { role: "assistant", content: "local welcome", localOnly: true },
          { role: "user", content: "帮我分析完播率" },
        ],
      },
    });

    expect(result.threadId).toBe("thread-test");
    expect(result.checkpoint.checkpointKind).toBe("memory");
    expect(result.usedModules).toEqual(["content-diagnosis"]);
    expect(result.agentRun.toolCalls.map((tool) => tool.name)).toContain(
      "rank_priority_insight",
    );
    expect(result.agentRun.answer).toContain("本次调用模块");
  });

  it("returns approval state for side-effect intents", async () => {
    const result = await invokeAgentGraph({
      diagnosis: diagnosis(),
      request: {
        creatorId: "starter-food",
        threadId: "thread-approval",
        activeModules: ["topic-opportunity"],
        messages: [{ role: "user", content: "把这些建议写入行动计划" }],
      },
    });

    expect(result.status).toBe("awaiting_approval");
    expect(result.approval?.threadId).toBe("thread-approval");
    expect(result.agentRun.answer).toContain("需要你确认");
  });

  it("uses the Postgres checkpoint provider when AGENT_CHECKPOINT_URL is configured", async () => {
    const postgresLikeSaver = Object.assign(new MemorySaver(), {
      setup: vi.fn().mockResolvedValue(undefined),
    });
    const fromConnString = vi
      .spyOn(PostgresSaver, "fromConnString")
      .mockReturnValue(postgresLikeSaver as never);

    vi.stubEnv(
      "AGENT_CHECKPOINT_URL",
      "postgresql://creator:creator@postgres:5432/creator_agent",
    );
    resetAgentGraphRuntimeForTests();

    try {
      const result = await invokeAgentGraph({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-postgres-checkpoint",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "帮我分析完播率" }],
        },
      });

      expect(fromConnString).toHaveBeenCalledWith(
        "postgresql://creator:creator@postgres:5432/creator_agent",
      );
      expect(postgresLikeSaver.setup).toHaveBeenCalled();
      expect(result.checkpoint.checkpointKind).toBe("postgres");
    } finally {
      fromConnString.mockRestore();
    }
  });

  it("falls back to memory checkpointing when Postgres setup fails", async () => {
    const fromConnString = vi
      .spyOn(PostgresSaver, "fromConnString")
      .mockReturnValue({
        setup: vi.fn().mockRejectedValue(new Error("postgres offline")),
      } as never);

    vi.stubEnv(
      "AGENT_CHECKPOINT_URL",
      "postgresql://creator:creator@postgres:5432/creator_agent",
    );
    resetAgentGraphRuntimeForTests();

    try {
      const result = await invokeAgentGraph({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-postgres-fallback",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "帮我分析完播率" }],
        },
      });

      expect(fromConnString).toHaveBeenCalled();
      expect(result.checkpoint.checkpointKind).toBe("memory");
    } finally {
      fromConnString.mockRestore();
    }
  });

  it("uses the AI SDK gateway for LLM synthesis when configured", async () => {
    const server = createServer((request, response) => {
      if (request.url !== "/chat/completions") {
        response.writeHead(404).end();
        return;
      }

      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "LLM 生成的创作者建议",
              },
            },
          ],
        }),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();

    try {
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose a port.");
      }

      vi.stubEnv("LLM_API_KEY", "test-key");
      vi.stubEnv("LLM_BASE_URL", `http://127.0.0.1:${address.port}`);
      vi.stubEnv("LLM_MODEL", "test-model");

      const result = await invokeAgentGraph({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-llm",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "帮我分析完播率" }],
        },
      });

      expect(result.mode).toBe("llm");
      expect(result.agentRun.mode).toBe("llm-assisted");
      expect(result.agentRun.answer).toBe("LLM 生成的创作者建议");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("calls the data kernel over internal HTTP when configured", async () => {
    const calls: Array<{
      url: string | undefined;
      authorization: string | undefined;
    }> = [];
    const server = createServer((request, response) => {
      calls.push({
        url: request.url,
        authorization: request.headers.authorization,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          requestId: `kernel-${calls.length}`,
          tool: request.url?.split("/").at(-1),
          result: { rows: [] },
          evidence: [
            {
              sourceTable: "history",
              rowCount: 7,
              columns: ["date", "views"],
              excerpt: `kernel evidence ${calls.length}`,
            },
          ],
          artifacts: [
            {
              id: `artifact-${calls.length}`,
              kind: "table",
              title: `Kernel artifact ${calls.length}`,
              data: {},
            },
          ],
        }),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();

    try {
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose a port.");
      }

      vi.stubEnv("DATA_KERNEL_URL", `http://127.0.0.1:${address.port}`);
      vi.stubEnv("DATA_KERNEL_TOKEN", "kernel-token");

      const result = await invokeAgentGraph({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-kernel",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "为什么完播率不好？" }],
        },
      });

      expect(calls.map((call) => call.url)).toEqual(
        expect.arrayContaining([
          "/tools/profile_dataset",
          "/tools/create_chart_data",
          "/tools/explain_metric_drop",
        ]),
      );
      expect(calls).toHaveLength(3);
      expect(
        calls.every((call) => call.authorization === "Bearer kernel-token"),
      ).toBe(true);
      expect(result.agentRun.toolCalls.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "profile_dataset",
          "create_chart_data",
          "explain_metric_drop",
        ]),
      );
      expect(result.agentRun.evidence.map((item) => item.sourceType)).toContain(
        "agent-tool",
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("streams business events without leaking framework types", async () => {
    const events = [];

    for await (const event of streamAgentGraphEvents({
      diagnosis: diagnosis(),
      request: {
        creatorId: "starter-food",
        threadId: "thread-stream",
        activeModules: ["content-diagnosis"],
        messages: [{ role: "user", content: "为什么完播率不好？" }],
      },
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "thread",
        "tool-call",
        "agent-run-patch",
        "text-delta",
        "agent-run",
        "finish",
      ]),
    );
    expect(
      events
        .filter((event) => event.type === "text-delta")
        .map((event) => event.delta)
        .join(""),
    ).toContain("本次调用模块");
  });

  it("streams data-kernel tool errors as business tool-call events", async () => {
    const server = createServer((_request, response) => {
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
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();

    try {
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose a port.");
      }

      vi.stubEnv("DATA_KERNEL_URL", `http://127.0.0.1:${address.port}`);

      const events = [];

      for await (const event of streamAgentGraphEvents({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-kernel-error-stream",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "为什么完播率不好？" }],
        },
      })) {
        events.push(event);
      }

      expect(
        events
          .filter((event) => event.type === "tool-call")
          .map((event) => event.toolCall),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "profile_dataset",
            status: "error",
            error: "Kernel unavailable.",
          }),
        ]),
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("streams LLM text deltas through the AI SDK gateway when configured", async () => {
    const server = createServer((request, response) => {
      if (request.url !== "/chat/completions") {
        response.writeHead(404).end();
        return;
      }

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
              delta: { content: "LLM " },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      response.write(
        `data: ${JSON.stringify({
          id: "chunk-2",
          object: "chat.completion.chunk",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              delta: { content: "分片回答" },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      response.write(
        `data: ${JSON.stringify({
          id: "chunk-3",
          object: "chat.completion.chunk",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        })}\n\n`,
      );
      response.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();

    try {
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose a port.");
      }

      vi.stubEnv("LLM_API_KEY", "test-key");
      vi.stubEnv("LLM_BASE_URL", `http://127.0.0.1:${address.port}`);
      vi.stubEnv("LLM_MODEL", "test-model");

      const events = [];

      for await (const event of streamAgentGraphEvents({
        diagnosis: diagnosis(),
        request: {
          creatorId: "starter-food",
          threadId: "thread-llm-stream",
          activeModules: ["content-diagnosis"],
          messages: [{ role: "user", content: "帮我分析完播率" }],
        },
      })) {
        events.push(event);
      }

      const textDeltas = events.filter((event) => event.type === "text-delta");
      const agentRun = events.find((event) => event.type === "agent-run");

      expect(textDeltas.map((event) => event.delta)).toEqual([
        "LLM ",
        "分片回答",
      ]);
      expect(agentRun?.agentRun.mode).toBe("llm-assisted");
      expect(agentRun?.agentRun.answer).toBe("LLM 分片回答");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("resumes approval decisions from the graph checkpoint", async () => {
    const pending = await invokeAgentGraph({
      diagnosis: diagnosis(),
      request: {
        creatorId: "starter-food",
        threadId: "thread-resume-checkpoint",
        activeModules: ["topic-opportunity"],
        messages: [{ role: "user", content: "把这些建议写入行动计划" }],
      },
    });
    expect(pending.approval?.id).toBeTruthy();

    const response = await resumeAgentGraph({
      request: {
        threadId: "thread-resume-checkpoint",
        approvalId: pending.approval!.id,
        decision: "approve",
      },
    });

    expect(response.status).toBe("completed");
    expect(response.agentRun?.toolCalls.at(-1)?.name).toBe("approval_resume");
    expect(response.agentRun?.actions.map((action) => action.status)).toContain(
      "accepted",
    );
  });
});
