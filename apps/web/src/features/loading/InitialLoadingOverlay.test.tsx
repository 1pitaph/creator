import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gsapMocks = vi.hoisted(() => {
  const timelines: Array<{
    set: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
  }> = [];

  return {
    killTweensOf: vi.fn(),
    registerPlugin: vi.fn(),
    set: vi.fn(),
    timelines,
    timeline: vi.fn(() => {
      const timeline = {
        set: vi.fn(() => timeline),
        to: vi.fn(() => timeline),
      };
      timelines.push(timeline);
      return timeline;
    }),
    to: vi.fn((_target: unknown, vars?: { onComplete?: () => void }) => {
      vars?.onComplete?.();
      return {};
    }),
  };
});

vi.mock("gsap", () => ({
  default: gsapMocks,
}));

vi.mock("@gsap/react", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    useGSAP: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

import { InitialLoadingOverlay } from "./InitialLoadingOverlay";
import { GRID_SIZE } from "./pixelLogoGeometry";

const installMatchMediaMock = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  });
};

describe("InitialLoadingOverlay", () => {
  beforeEach(() => {
    gsapMocks.killTweensOf.mockClear();
    gsapMocks.registerPlugin.mockClear();
    gsapMocks.set.mockClear();
    gsapMocks.timeline.mockClear();
    gsapMocks.timelines.length = 0;
    gsapMocks.to.mockClear();
    installMatchMediaMock(false);
  });

  it("renders a centered status overlay and active silhouette pixel logo", () => {
    const { container } = render(<InitialLoadingOverlay active onExitComplete={vi.fn()} />);
    const pixels = container.querySelectorAll(".pixel-logo-loader__pixel");

    expect(
      screen.getByRole("status", { name: "正在加载创作者画像" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("initial-loading-overlay")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByTestId("pixel-logo-loader")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.length).toBeLessThan(GRID_SIZE * GRID_SIZE);
    expect(gsapMocks.timeline).toHaveBeenCalledTimes(1);
    expect(
      gsapMocks.timelines[0]?.to.mock.calls.some((call) => {
        const vars = call[1] as { stagger?: { grid?: number[] } } | undefined;

        return vars?.stagger?.grid?.[0] === GRID_SIZE && vars.stagger.grid[1] === GRID_SIZE;
      }),
    ).toBe(true);
  });

  it("uses the reduced motion branch when the user prefers less motion", () => {
    installMatchMediaMock(true);

    render(<InitialLoadingOverlay active onExitComplete={vi.fn()} />);

    expect(screen.getByTestId("pixel-logo-loader")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    expect(gsapMocks.timeline).not.toHaveBeenCalled();
    expect(gsapMocks.set).toHaveBeenCalled();
  });
});
