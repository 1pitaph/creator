import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleLoadMode } from "@creator/data-contracts";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardViewModel } from "./model";
import { DashboardPage } from "./DashboardPage";

vi.mock("react-grid-layout", async () => {
  const React = await import("react");
  const renderResizeHandles = (cardId: string, handles: readonly string[]) =>
    handles.map((axis) =>
      React.createElement("span", {
        key: axis,
        className: `react-resizable-handle react-resizable-handle-${axis} dashboard-card-resize-edge dashboard-card-resize-edge--${axis}`,
        "data-dashboard-resize-axis": axis,
        "data-testid": `visual-resize-handle-${cardId}-${axis}`,
      }),
    );

  return {
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
        handleComponent?: unknown;
        handles?: readonly string[];
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
        {React.Children.map(children, (child) => {
          if (
            !React.isValidElement<{
              children?: ReactNode;
              "data-dashboard-card-id"?: string;
            }>(child)
          ) {
            return child;
          }

          const cardId = child.props["data-dashboard-card-id"];

          if (!cardId) {
            return child;
          }

          return React.cloneElement(
            child,
            undefined,
            React.createElement(
              React.Fragment,
              null,
              child.props.children,
              ...renderResizeHandles(cardId, resizeConfig?.handles ?? []),
            ),
          );
        })}
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
  };
});

const renderDashboard = ({
  moduleLoadMode = "focused",
  panel = "overview",
}: {
  moduleLoadMode?: ModuleLoadMode;
  panel?: "overview" | "board" | "table";
} = {}) => {
  const diagnosis = localDiagnosis(defaultCreatorId, moduleLoadMode);
  const viewModel = buildDashboardViewModel(diagnosis);
  const onAskAgent = vi.fn();
  const onModuleLoadModeChange = vi.fn();
  const renderPage = (nextPanel = panel, nextModuleLoadMode = moduleLoadMode) => {
    const nextDiagnosis = nextModuleLoadMode === moduleLoadMode ? diagnosis : localDiagnosis(defaultCreatorId, nextModuleLoadMode);
    const nextViewModel = nextModuleLoadMode === moduleLoadMode ? viewModel : buildDashboardViewModel(nextDiagnosis);

    return (
      <DashboardPage
        creatorId={defaultCreatorId}
        diagnosis={nextDiagnosis}
        moduleLoadMode={nextModuleLoadMode}
        onModuleLoadModeChange={onModuleLoadModeChange}
        panel={nextPanel}
        onAskAgent={onAskAgent}
        viewModel={nextViewModel}
      />
    );
  };

  const view = render(renderPage(panel, moduleLoadMode));

  return {
    diagnosis,
    onAskAgent,
    onModuleLoadModeChange,
    rerenderPanel: (nextPanel: "overview" | "board" | "table") =>
      view.rerender(renderPage(nextPanel, moduleLoadMode)),
    rerenderMode: (nextModuleLoadMode: ModuleLoadMode) =>
      view.rerender(renderPage(panel, nextModuleLoadMode)),
  };
};

const readStoredPreferences = () => {
  const raw = window.localStorage.getItem(
    `creator-dashboard-preferences:${defaultCreatorId}:v1`,
  );
  return raw
    ? (JSON.parse(raw) as {
        cards: Record<string, { visible: boolean }>;
        visual: { layouts: { lg: Array<{ h: number; i: string; w: number; x: number }> } };
      })
    : null;
};

const readStoredLayoutItem = (cardId: string) =>
  readStoredPreferences()?.visual.layouts.lg.find((item) => item.i === cardId);

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

const installPointerCaptureMocks = () => {
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
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
    installPointerCaptureMocks();
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

  it("renders module mode switcher and panel-controlled views", () => {
    const { rerenderPanel } = renderDashboard();

    expect(screen.getByTestId("aurora-background")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-mode-indicator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "少而准" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "覆盖完整" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "动态阈值" })).toBeInTheDocument();
    expect(screen.getByTestId("visual-grid")).toBeInTheDocument();
    expect(screen.queryByText("创作者 AI 数据面板")).not.toBeInTheDocument();
    expect(screen.queryByText(/增长诊断台/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("拖动卡片：AI 诊断摘要"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("visual-resize-handle-summary-e"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("visual-resize-handle-summary-s"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();

    rerenderPanel("board");
    expect(screen.getByText("今天")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("拖动卡片：AI 诊断摘要"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("visual-resize-handle-summary-e"),
    ).not.toBeInTheDocument();

    rerenderPanel("table");
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("AI 诊断摘要")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("拖动卡片：AI 诊断摘要"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("visual-resize-handle-summary-s"),
    ).not.toBeInTheDocument();
  });

  it("moves the module mode indicator to the selected pill", async () => {
    const { onModuleLoadModeChange, rerenderMode } = renderDashboard();

    const indicator = screen.getByTestId("dashboard-mode-indicator");
    const completeButton = screen.getByRole("button", { name: "覆盖完整" });
    const adaptiveButton = screen.getByRole("button", { name: "动态阈值" });

    setButtonMetrics(completeButton, { offsetLeft: 88, offsetWidth: 87 });
    setButtonMetrics(adaptiveButton, { offsetLeft: 175, offsetWidth: 83 });

    fireEvent.click(completeButton);
    expect(onModuleLoadModeChange).toHaveBeenCalledWith("complete");
    rerenderMode("complete");

    await waitFor(() => {
      expect(indicator).toHaveStyle({
        transform: "translate3d(88px, 0px, 0px)",
        width: "87px",
      });
    });

    const nextIndicator = screen.getByTestId("dashboard-mode-indicator");
    const nextAdaptiveButton = screen.getByRole("button", { name: "动态阈值" });
    setButtonMetrics(nextAdaptiveButton, { offsetLeft: 175, offsetWidth: 83 });
    fireEvent.click(nextAdaptiveButton);
    expect(onModuleLoadModeChange).toHaveBeenCalledWith("adaptive");
    rerenderMode("adaptive");

    await waitFor(() => {
      expect(nextIndicator).toHaveStyle({
        transform: "translate3d(175px, 0px, 0px)",
        width: "83px",
      });
    });
  });

  it("hides a card from Table and removes it from Visual", async () => {
    const { rerenderPanel } = renderDashboard({ panel: "table" });

    fireEvent.click(screen.getByLabelText("隐藏 AI 诊断摘要"));
    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary?.visible).toBe(false);
    });
    rerenderPanel("overview");

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
    const rightResizeHandle = screen.getByTestId("visual-resize-handle-summary-e");
    const bottomResizeHandle = screen.getByTestId("visual-resize-handle-summary-s");
    const askButton = screen.getByLabelText("询问 AI Agent：AI 诊断摘要");
    const resizeHandles = grid.dataset.resizeHandles?.split(",") ?? [];

    expect(grid).toHaveAttribute("data-drag-enabled", "true");
    expect(grid).toHaveAttribute("data-resize-enabled", "true");
    expect(resizeHandles).toEqual(expect.arrayContaining(["e", "s"]));
    expect(resizeHandles).not.toContain("se");
    expect(screen.queryByTestId("visual-resize-handle-summary-se")).not.toBeInTheDocument();
    expect(grid).toHaveAttribute(
      "data-drag-handle",
      ".dashboard-card-drag-handle",
    );
    expect(handle.matches(grid.dataset.dragHandle ?? "")).toBe(true);
    expect(handle.matches(grid.dataset.dragCancel ?? "")).toBe(false);
    expect(rightResizeHandle.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(rightResizeHandle.matches(grid.dataset.dragCancel ?? "")).toBe(true);
    expect(bottomResizeHandle.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(bottomResizeHandle.matches(grid.dataset.dragCancel ?? "")).toBe(true);
    expect(askButton.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(askButton.matches(grid.dataset.dragCancel ?? "")).toBe(true);

    fireEvent.click(askButton);

    expect(onAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "AI 诊断摘要" }),
    );
  });

  it("resizes Visual cards from the right edge on the width axis only", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(readStoredLayoutItem("summary")).toMatchObject({ h: 7, w: 6 });
    });

    const initial = readStoredLayoutItem("summary");
    const rightResizeHandle = screen.getByTestId("visual-resize-handle-summary-e");

    fireEvent.pointerDown(rightResizeHandle, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(rightResizeHandle, {
      clientX: 120,
      clientY: 240,
      pointerId: 1,
    });
    fireEvent.pointerUp(rightResizeHandle, {
      clientX: 120,
      clientY: 240,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: initial?.h,
        w: (initial?.w ?? 0) + 1,
      });
    });
  });

  it("resizes Visual cards from the bottom edge on the height axis only", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(readStoredLayoutItem("summary")).toMatchObject({ h: 7, w: 6 });
    });

    const initial = readStoredLayoutItem("summary");
    const bottomResizeHandle = screen.getByTestId("visual-resize-handle-summary-s");

    fireEvent.pointerDown(bottomResizeHandle, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(bottomResizeHandle, {
      clientX: 240,
      clientY: 110,
      pointerId: 1,
    });
    fireEvent.pointerUp(bottomResizeHandle, {
      clientX: 240,
      clientY: 110,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: (initial?.h ?? 0) + 2,
        w: initial?.w,
      });
    });
  });

  it("keeps Board drag behavior behind the Board edit mode", () => {
    const { diagnosis } = renderDashboard({ panel: "board" });
    const firstActionLabel = diagnosis.insights.flatMap((insight) => insight.actions)[0]?.label;

    expect(firstActionLabel).toBeTruthy();

    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
    expect(screen.getByText(firstActionLabel as string).closest("article")).not.toHaveClass("cursor-grab");

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(screen.getByRole("button", { name: "完成" })).toBeInTheDocument();
    expect(screen.getByText(firstActionLabel as string).closest("article")).toHaveClass("cursor-grab");
  });
});
