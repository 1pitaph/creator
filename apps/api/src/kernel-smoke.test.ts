import type { FastifyInstance } from "fastify";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetAgentGraphRuntimeForTests } from "@creator/agent-graph";
import { buildApiApp } from "./server";

let app: FastifyInstance | undefined;

const parseSseChunks = (payload: string) =>
  payload
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length).trim())
    .filter((line) => line && line !== "[DONE]")
    .map(
      (line) => JSON.parse(line) as { type: string; [key: string]: unknown },
    );

const getFreePort = async () =>
  new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolvePort(address.port));
    });
  });

const waitForHealth = async (url: string) => {
  const deadline = Date.now() + 10_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }

  throw new Error(
    `Data kernel did not become healthy: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`,
  );
};

const stopProcess = async (processRef: ChildProcessWithoutNullStreams) => {
  if (processRef.exitCode !== null || processRef.signalCode) {
    return;
  }

  await new Promise<void>((resolveStop) => {
    processRef.once("exit", () => resolveStop());
    processRef.kill("SIGTERM");
    setTimeout(() => {
      if (processRef.exitCode === null && !processRef.signalCode) {
        processRef.kill("SIGKILL");
      }
    }, 2_000).unref();
  });
};

const smokeIt =
  process.env.RUN_DATA_KERNEL_SMOKE === "1" ? it : it.skip;

beforeEach(async () => {
  vi.stubEnv("AGENT_CHECKPOINT_URL", "");
  vi.stubEnv("DATA_KERNEL_URL", "");
  vi.stubEnv("DATA_KERNEL_TOKEN", "");
  vi.stubEnv("LLM_API_KEY", "");
  resetAgentGraphRuntimeForTests();
});

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
});

describe("data kernel smoke", () => {
  smokeIt(
    "streams through the API into a real FastAPI data-kernel process",
    async () => {
      const python =
        process.env.DATA_KERNEL_PYTHON ??
        "/tmp/creator-data-kernel-venv/bin/python";
      const port = await getFreePort();
      const kernelUrl = `http://127.0.0.1:${port}`;
      const token = "smoke-token";
      const kernel = spawn(
        python,
        [
          "-m",
          "uvicorn",
          "app.main:app",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          cwd: resolve(process.cwd(), "../data-kernel"),
          env: {
            ...process.env,
            DATA_KERNEL_TOKEN: token,
          },
        },
      );

      let stderr = "";
      kernel.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      try {
        await waitForHealth(kernelUrl);
        vi.stubEnv("DATA_KERNEL_URL", kernelUrl);
        vi.stubEnv("DATA_KERNEL_TOKEN", token);
        process.env.DATA_KERNEL_URL = kernelUrl;
        process.env.DATA_KERNEL_TOKEN = token;
        resetAgentGraphRuntimeForTests();

        app = await buildApiApp();
        await app.ready();

        const response = await app.inject({
          method: "POST",
          url: "/api/chat/stream",
          payload: {
            creatorId: "short-drama-strategy",
            threadId: "thread-kernel-smoke",
            activeModules: ["content-diagnosis"],
            messages: [{ role: "user", content: "为什么完播率不好？" }],
          },
        });
        const chunks = parseSseChunks(response.payload);
        const agentRun = chunks.find(
          (chunk) => chunk.type === "data-agent-run",
        )?.data as
          | {
              evidence?: Array<{ sourceType?: string }>;
              toolCalls?: Array<{ name?: string; status?: string }>;
            }
          | undefined;

        expect(response.statusCode).toBe(200);
        expect(chunks.map((chunk) => chunk.type)).toContain(
          "data-agent-tool-call",
        );
        const toolSummary =
          agentRun?.toolCalls?.map((tool) => `${tool.name}:${tool.status}`) ??
          [];

        const toolSummaryText = toolSummary.join("\n");

        for (const expectedTool of [
          "profile_dataset:success",
          "create_chart_data:success",
          "explain_metric_drop:success",
        ]) {
          if (!toolSummaryText.includes(expectedTool)) {
            const errorSummary = (agentRun?.toolCalls ?? [])
              .filter((tool) => tool.status === "error")
              .map((tool) => `${tool.name}: ${tool.error ?? tool.outputSummary}`)
              .join("\n");
            throw new Error(
              `Missing ${expectedTool}.\nTools:\n${toolSummaryText}\nErrors:\n${errorSummary}\nChunk types:\n${chunks
                .map((chunk) => chunk.type)
                .join("\n")}`,
            );
          }
        }
        expect(agentRun?.evidence).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ sourceType: "agent-tool" }),
          ]),
        );
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\n${stderr}`,
        );
      } finally {
        await stopProcess(kernel);
      }
    },
    20_000,
  );
});
