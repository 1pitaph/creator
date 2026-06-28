import { createServer, type IncomingMessage } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateGatewayText, streamGatewayText } from "./index";

const readBody = async (request: IncomingMessage) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ai gateway", () => {
  it("returns null when no LLM key is configured", async () => {
    vi.stubEnv("LLM_API_KEY", "");

    await expect(
      generateGatewayText({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toBeNull();
    expect(
      streamGatewayText({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).toBeNull();
  });

  it("merges explicit and message system prompts for generateText", async () => {
    let captured: Record<string, unknown> | undefined;
    const server = createServer(async (request, response) => {
      captured = await readBody(request);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "ok",
              },
              finish_reason: "stop",
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

      const text = await generateGatewayText(
        {
          system: "top level system",
          messages: [
            { role: "system", content: "message system" },
            { role: "user", content: "hello" },
          ],
        },
        {
          apiKey: "test-key",
          baseUrl: `http://127.0.0.1:${address.port}`,
          model: "test-model",
        },
      );

      expect(text).toBe("ok");
      expect(captured?.model).toBe("test-model");
      expect(captured?.messages).toEqual([
        { role: "system", content: "top level system\n\nmessage system" },
        { role: "user", content: "hello" },
      ]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("streams OpenAI-compatible SSE text deltas", async () => {
    const server = createServer((_request, response) => {
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
              delta: { content: "hello " },
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
              delta: { content: "stream" },
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

      const stream = streamGatewayText(
        {
          messages: [{ role: "user", content: "hello" }],
        },
        {
          apiKey: "test-key",
          baseUrl: `http://127.0.0.1:${address.port}`,
          model: "test-model",
        },
      );
      const chunks = [];

      for await (const chunk of stream ?? []) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["hello ", "stream"]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
