import { createDiagnosis } from "@creator/ai-modules";
import { getMockCreator } from "@creator/mock-data";
import { describe, expect, it, vi } from "vitest";

import { createDataKernelClient } from "./index";

const diagnosis = () => {
  const creator = getMockCreator("short-drama-strategy");

  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics,
  });
};

describe("data kernel client", () => {
  it("sends a validated DatasetSnapshot with bearer auth", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          requestId: "request-1",
          tool: "profile_dataset",
          result: { ok: true },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const client = createDataKernelClient({
      baseUrl: "http://kernel.internal/",
      token: "secret-token",
      fetchImpl,
    });

    const response = await client.runTool({
      diagnosis: diagnosis(),
      tool: "profile_dataset",
      requestId: "request-1",
      limits: { maxRows: 25 },
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(response.ok).toBe(true);
    expect(url).toBe("http://kernel.internal/tools/profile_dataset");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      authorization: "Bearer secret-token",
    });
    expect(body).toMatchObject({
      requestId: "request-1",
      tool: "profile_dataset",
      creatorId: "short-drama-strategy",
      limits: { maxRows: 25, maxExecutionMs: 3000, maxColumns: 40 },
    });
    expect(body.dataset.history.length).toBeGreaterThan(0);
    expect(body.dataset.topContents.length).toBeGreaterThan(0);
  });

  it("normalizes HTTP failures into DataKernelResponse errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "nope" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createDataKernelClient({
      baseUrl: "http://kernel.internal",
      fetchImpl,
    });

    const response = await client.runTool({
      diagnosis: diagnosis(),
      tool: "run_sql",
      requestId: "request-2",
      input: { sql: "select * from history" },
    });

    expect(response).toMatchObject({
      ok: false,
      requestId: "request-2",
      tool: "run_sql",
      error: {
        code: "HTTP_401",
        message: "Data kernel request failed.",
      },
    });
  });

  it("aborts requests after the configured timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const client = createDataKernelClient({
      baseUrl: "http://kernel.internal",
      timeoutMs: 1,
      fetchImpl,
    });

    const response = await client.runTool({
      diagnosis: diagnosis(),
      tool: "create_chart_data",
      requestId: "request-3",
    });

    expect(response).toMatchObject({
      ok: false,
      requestId: "request-3",
      tool: "create_chart_data",
      error: {
        code: "TIMEOUT",
      },
    });
  });
});
