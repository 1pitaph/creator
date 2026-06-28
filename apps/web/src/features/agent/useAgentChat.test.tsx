import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import type { ChatReplyPayload } from "./api";
import { useAgentChat } from "./useAgentChat";

const createIdFactory = () => {
  let index = 0;
  return () => `id-${++index}`;
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe("useAgentChat", () => {
  it("sends module-scoped chat payloads and appends the streamed reply", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const idFactory = createIdFactory();
    const fetcher = vi.fn().mockResolvedValue({
      reply: "建议先重写前 3 秒。",
      usedModules: ["content-diagnosis"],
      mode: "mock"
    } satisfies ChatReplyPayload);

    const { result } = renderHook(() =>
      useAgentChat({
        activeModuleIds: diagnosis.modules.map((module) => module.id),
        creatorId: defaultCreatorId,
        diagnosis,
        fetcher,
        idFactory,
        streamDelayMs: 0
      })
    );

    act(() => {
      result.current.askTarget({
        title: "完播率",
        prompt: "帮我分析完播率",
        moduleId: "content-diagnosis"
      });
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0]?.[0]).toMatchObject({
      creatorId: defaultCreatorId,
      activeModules: ["content-diagnosis"]
    });
    expect(fetcher.mock.calls[0]?.[0].messages.at(-1)).toEqual({ role: "user", content: "帮我分析完播率" });

    await waitFor(() => expect(result.current.messages.at(-1)?.content).toBe("建议先重写前 3 秒。"));
    expect(result.current.messages.at(-1)?.mode).toBe("mock");
  });

  it("uses the local fallback reply when chat fetch fails", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const idFactory = createIdFactory();
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() =>
      useAgentChat({
        activeModuleIds: diagnosis.modules.map((module) => module.id),
        creatorId: defaultCreatorId,
        diagnosis,
        fetcher,
        idFactory,
        streamDelayMs: 0
      })
    );

    act(() => {
      result.current.askTarget({
        title: "粉丝经营诊断",
        prompt: "为什么最近转粉变低？",
        moduleId: "fan-operation"
      });
    });

    await waitFor(() => expect(result.current.messages.at(-1)?.mode).toBe("local"));
    expect(result.current.messages.at(-1)?.content).toContain("这次判断调用了");
  });

  it("does not append stale replies after creator changes", async () => {
    const firstDiagnosis = localDiagnosis(defaultCreatorId);
    const secondDiagnosis = localDiagnosis("growth-knowledge");
    const idFactory = createIdFactory();
    const reply = createDeferred<ChatReplyPayload>();
    const fetcher = vi.fn(() => reply.promise);

    const { result, rerender } = renderHook(
      ({ creatorId, diagnosis }) =>
        useAgentChat({
          activeModuleIds: diagnosis.modules.map((module) => module.id),
          creatorId,
          diagnosis,
          fetcher,
          idFactory,
          streamDelayMs: 0
        }),
      {
        initialProps: {
          creatorId: defaultCreatorId,
          diagnosis: firstDiagnosis
        }
      }
    );

    act(() => {
      result.current.askTarget({
        title: "旧问题",
        prompt: "旧账号的问题"
      });
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender({
      creatorId: secondDiagnosis.creator.id,
      diagnosis: secondDiagnosis
    });

    await act(async () => {
      reply.resolve({
        reply: "旧账号回复不应该出现",
        usedModules: [],
        mode: "mock"
      });
      await reply.promise;
    });

    expect(result.current.messages.some((message) => message.content.includes("旧账号回复不应该出现"))).toBe(false);
  });
});
