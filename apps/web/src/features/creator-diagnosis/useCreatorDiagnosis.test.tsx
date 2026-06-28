import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { creatorOptions, defaultCreatorId } from "./creatorOptions";
import { localDiagnosis } from "./api";
import { useCreatorDiagnosis } from "./useCreatorDiagnosis";

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
};

describe("useCreatorDiagnosis", () => {
  it("uses fetched diagnosis when the API succeeds", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const fetcher = vi.fn().mockResolvedValue(diagnosis);

    const { result } = renderHook(() => useCreatorDiagnosis({ fetcher }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(defaultCreatorId, expect.any(AbortSignal)));
    await waitFor(() => expect(result.current.isLoadingDiagnosis).toBe(false));

    expect(result.current.diagnosis.creator.id).toBe(defaultCreatorId);
  });

  it("falls back to local diagnosis when the API fails", async () => {
    const fallback = vi.fn(localDiagnosis);
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useCreatorDiagnosis({ fallback, fetcher }));

    await waitFor(() => expect(result.current.isLoadingDiagnosis).toBe(false));

    expect(fallback).toHaveBeenCalledWith(defaultCreatorId);
    expect(result.current.diagnosis.creator.id).toBe(defaultCreatorId);
  });

  it("ignores stale responses after switching creators", async () => {
    const firstCreatorId = creatorOptions[0]!.id;
    const secondCreatorId = creatorOptions[1]!.id;
    const firstRequest = createDeferred<ReturnType<typeof localDiagnosis>>();
    const secondRequest = createDeferred<ReturnType<typeof localDiagnosis>>();
    const fetcher = vi.fn((creatorId: string) => (creatorId === firstCreatorId ? firstRequest.promise : secondRequest.promise));

    const { result } = renderHook(() => useCreatorDiagnosis({ fetcher, initialCreatorId: firstCreatorId }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(firstCreatorId, expect.any(AbortSignal)));

    act(() => {
      result.current.setSelectedCreatorId(secondCreatorId);
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(secondCreatorId, expect.any(AbortSignal)));

    await act(async () => {
      secondRequest.resolve(localDiagnosis(secondCreatorId));
      await secondRequest.promise;
    });

    expect(result.current.diagnosis.creator.id).toBe(secondCreatorId);

    await act(async () => {
      firstRequest.resolve(localDiagnosis(firstCreatorId));
      await firstRequest.promise;
    });

    expect(result.current.diagnosis.creator.id).toBe(secondCreatorId);
  });
});
