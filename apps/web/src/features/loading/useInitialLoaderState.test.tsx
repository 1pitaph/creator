import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useInitialLoaderState } from "./useInitialLoaderState";

describe("useInitialLoaderState", () => {
  it("shows only for the first observed loading cycle", async () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) =>
        useInitialLoaderState(isLoading),
      { initialProps: { isLoading: true } },
    );

    await waitFor(() => {
      expect(result.current.showInitialLoader).toBe(true);
    });
    expect(result.current.initialLoaderActive).toBe(true);

    rerender({ isLoading: false });

    await waitFor(() => {
      expect(result.current.showInitialLoader).toBe(true);
      expect(result.current.initialLoaderActive).toBe(false);
    });

    act(() => {
      result.current.completeInitialLoader();
    });

    expect(result.current.showInitialLoader).toBe(false);

    rerender({ isLoading: true });

    expect(result.current.showInitialLoader).toBe(false);
    expect(result.current.initialLoaderActive).toBe(false);
  });
});
