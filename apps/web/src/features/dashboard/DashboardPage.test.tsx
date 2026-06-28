import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardViewModel } from "./model";
import { DashboardPage } from "./DashboardPage";

vi.mock("react-grid-layout", () => ({
  ResponsiveGridLayout: ({
    children,
    dragConfig,
    onLayoutChange,
    resizeConfig,
  }: {
    children: ReactNode;
    dragConfig?: {
      enabled?: boolean;
      handle?: string;
      cancel?: string;
    };
    onLayoutChange?: (
      layout: unknown[],
      layouts: Record<string, unknown[]>,
    ) => void;
    resizeConfig?: {
      enabled?: boolean;
      handles?: string[];
    };
  }) => (
    <div
      data-testid="visual-grid"
      data-drag-enabled={String(dragConfig?.enabled)}
      data-drag-handle={dragConfig?.handle ?? ""}
      data-drag-cancel={dragConfig?.cancel ?? ""}
      data-resize-enabled={String(resizeConfig?.enabled)}
      data-resize-handles={(resizeConfig?.handles ?? []).join(",")}
    >
      <button
        type="button"
        onClick={() =>
          onLayoutChange?.([], {
            lg: [{ i: "summary", x: 1, y: 2, w: 3, h: 4 }],
            md: [],
            sm: [],
            xs: [],
          })
        }
      >
        mock layout change
      </button>
      {children}
    </div>
  ),
  moveElement: (
    layout: Array<{ i: string; x: number; y: number }>,
    item: { i: string; x: number; y: number },
    x: number,
    y: number,
  ) =>
    layout.map((layoutItem) =>
      layoutItem.i === item.i ? { ...layoutItem, x, y } : layoutItem,
    ),
  verticalCompactor: {
    compact: (layout: unknown[]) => layout,
  },
  useContainerWidth: () => ({
    containerRef: { current: null },
    mounted: true,
    width: 1200,
  }),
}));

const renderDashboard = () => {
  const diagnosis = localDiagnosis(defaultCreatorId);
  const viewModel = buildDashboardViewModel(diagnosis);
  const onAskAgent = vi.fn();

  render(
    <DashboardPage
      creatorId={defaultCreatorId}
      diagnosis={diagnosis}
      onAskAgent={onAskAgent}
      viewModel={viewModel}
    />,
  );

  return {
    diagnosis,
    onAskAgent,
  };
};

const readStoredPreferences = () => {
  const raw = window.localStorage.getItem(
    `creator-dashboard-preferences:${defaultCreatorId}:v1`,
  );
  return raw
    ? (JSON.parse(raw) as {
        visual: { layouts: { lg: Array<{ i: string; x: number }> } };
      })
    : null;
};

const installLocalStorageMock = () => {
  const store = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
};

const setButtonMetrics = (
  element: HTMLElement,
  metrics: { offsetLeft: number; offsetWidth: number },
) => {
  Object.defineProperty(element, "offsetLeft", {
    configurable: true,
    value: metrics.offsetLeft,
  });
  Object.defineProperty(element, "offsetWidth", {
    configurable: true,
    value: metrics.offsetWidth,
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return new Response(
            JSON.stringify({ preferences: JSON.parse(String(init.body)) }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify({ preferences: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Visual, Board, and Table views", () => {
    renderDashboard();

    expect(screen.getByTestId("aurora-background")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-view-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("visual-grid")).toBeInTheDocument();
    expect(screen.queryByText("创作者 AI 数据面板")).not.toBeInTheDocument();
    expect(screen.queryByText(/增长诊断台/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("拖动卡片：AI 诊断摘要"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.getByText("今天")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("拖动卡片：AI 诊断摘要"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("AI 诊断摘要")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("拖动卡片：AI 诊断摘要"),
    ).not.toBeInTheDocument();
  });

  it("moves the view indicator to the selected pill", async () => {
    renderDashboard();

    const indicator = screen.getByTestId("dashboard-view-indicator");
    const boardButton = screen.getByRole("button", { name: "Board" });
    const tableButton = screen.getByRole("button", { name: "Table" });

    setButtonMetrics(boardButton, { offsetLeft: 88, offsetWidth: 87 });
    setButtonMetrics(tableButton, { offsetLeft: 175, offsetWidth: 83 });

    fireEvent.click(boardButton);

    await waitFor(() => {
      expect(indicator).toHaveStyle({
        transform: "translate3d(88px, 0px, 0px)",
        width: "87px",
      });
    });
    expect(boardButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(tableButton);

    await waitFor(() => {
      expect(indicator).toHaveStyle({
        transform: "translate3d(175px, 0px, 0px)",
        width: "83px",
      });
    });
    expect(tableButton).toHaveAttribute("aria-pressed", "true");
  });

  it("hides a card from Table and removes it from Visual", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    fireEvent.click(screen.getByLabelText("隐藏 AI 诊断摘要"));
    fireEvent.click(screen.getByRole("button", { name: "Visual" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "AI 诊断摘要" }),
      ).not.toBeInTheDocument();
    });
  });

  it("saves Visual layout changes without entering edit mode", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "mock layout change" }));

    await waitFor(() => {
      expect(readStoredPreferences()?.visual.layouts.lg[0]).toMatchObject({
        i: "summary",
        x: 1,
      });
    });
  });

  it("uses the six-dot handle as the only Visual drag start target", () => {
    const { onAskAgent } = renderDashboard();

    const grid = screen.getByTestId("visual-grid");
    const handle = screen.getByLabelText("拖动卡片：AI 诊断摘要");
    const askButton = screen.getByLabelText("询问 AI Agent：AI 诊断摘要");

    expect(grid).toHaveAttribute("data-drag-enabled", "true");
    expect(grid).toHaveAttribute("data-resize-enabled", "true");
    expect(grid).toHaveAttribute("data-resize-handles", "se");
    expect(grid).toHaveAttribute(
      "data-drag-handle",
      ".dashboard-card-drag-handle",
    );
    expect(handle.matches(grid.dataset.dragHandle ?? "")).toBe(true);
    expect(handle.matches(grid.dataset.dragCancel ?? "")).toBe(false);
    expect(askButton.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(askButton.matches(grid.dataset.dragCancel ?? "")).toBe(true);

    fireEvent.click(askButton);

    expect(onAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "AI 诊断摘要" }),
    );
  });

  it("keeps Board drag behavior behind the Board edit mode", () => {
    const { diagnosis } = renderDashboard();
    const firstActionLabel = diagnosis.insights.flatMap((insight) => insight.actions)[0]?.label;

    expect(firstActionLabel).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
    expect(screen.getByText(firstActionLabel as string).closest("article")).not.toHaveClass("cursor-grab");

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(screen.getByRole("button", { name: "完成" })).toBeInTheDocument();
    expect(screen.getByText(firstActionLabel as string).closest("article")).toHaveClass("cursor-grab");
  });
});
