import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInitialLoaderState } from "./useInitialLoaderState";

describe("useInitialLoaderState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is active on initial render before React observes the data request", () => {
    const { result } = renderHook(() => useInitialLoaderState(false));

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(true);
  });

  it("exits after the first observed loading cycle and minimum visible time", () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) =>
        useInitialLoaderState(isLoading),
      { initialProps: { isLoading: false } },
    );

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(true);

    rerender({ isLoading: true });
    expect(result.current.initialLoaderActive).toBe(true);

    rerender({ isLoading: false });

    act(() => {
      vi.advanceTimersByTime(899);
    });

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(false);

    act(() => {
      result.current.completeInitialLoader();
    });

    expect(result.current.showInitialLoader).toBe(false);

    rerender({ isLoading: true });

    expect(result.current.showInitialLoader).toBe(false);
    expect(result.current.initialLoaderActive).toBe(false);
  });

  it("exits immediately when loading finishes after the minimum visible time already elapsed", () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) => useInitialLoaderState(isLoading),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    rerender({ isLoading: false });

    expect(result.current.showInitialLoader).toBe(true);
    expect(result.current.initialLoaderActive).toBe(false);
  });
});
