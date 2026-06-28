import { createDiagnosis } from "@creator/ai-modules";
import { getMockCreator } from "@creator/mock-data";
import { createServer } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { invokeAgentGraph, resumeAgentGraph, streamAgentGraphEvents } from "./index";

const diagnosis = () => {
  const creator = getMockCreator("starter-food");

  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics
  });
};

beforeEach(() => {
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
          { role: "user", content: "帮我分析完播率" }
        ]
      }
    });

    expect(result.threadId).toBe("thread-test");
    expect(result.checkpoint.checkpointKind).toBe("memory");
    expect(result.usedModules).toEqual(["content-diagnosis"]);
    expect(result.agentRun.toolCalls.map((tool) => tool.name)).toContain("rank_priority_insight");
    expect(result.agentRun.answer).toContain("本次调用模块");
  });

  it("returns approval state for side-effect intents", async () => {
    const result = await invokeAgentGraph({
      diagnosis: diagnosis(),
      request: {
        creatorId: "starter-food",
        threadId: "thread-approval",
        activeModules: ["topic-opportunity"],
        messages: [{ role: "user", content: "把这些建议写入行动计划" }]
      }
    });

    expect(result.status).toBe("awaiting_approval");
    expect(result.approval?.threadId).toBe("thread-approval");
    expect(result.agentRun.answer).toContain("需要你确认");
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
                content: "LLM 生成的创作者建议"
              }
            }
          ]
        })
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
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
          messages: [{ role: "user", content: "帮我分析完播率" }]
        }
      });

      expect(result.mode).toBe("llm");
      expect(result.agentRun.mode).toBe("llm-assisted");
      expect(result.agentRun.answer).toBe("LLM 生成的创作者建议");
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
        messages: [{ role: "user", content: "为什么完播率不好？" }]
      }
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["thread", "tool-call", "agent-run-patch", "text-delta", "agent-run", "finish"])
    );
    expect(events.find((event) => event.type === "text-delta")?.delta).toContain("本次调用模块");
  });

  it("resumes approval decisions", async () => {
    const response = await resumeAgentGraph({
      request: {
        threadId: "thread-approval",
        approvalId: "approval-1",
        decision: "approve"
      }
    });

    expect(response.status).toBe("completed");
    expect(response.agentRun?.toolCalls[0]?.name).toBe("approval_resume");
  });
});
