import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardPreferencesV1, ModuleLoadMode } from "@creator/data-contracts";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardActionCards, buildDashboardCards, buildDefaultDashboardPreferences } from "./customization";
import { buildDashboardViewModel } from "./model";
import { DashboardPage } from "./DashboardPage";
import { VisualDashboardView } from "./views/VisualDashboardView";

const containerWidthMock = vi.hoisted(() => ({
  mounted: true,
  width: 1200,
}));

vi.mock("react-grid-layout", async () => {
  const React = await import("react");

  return {
    ResponsiveGridLayout: ({
      children,
      containerPadding,
      cols,
      dragConfig,
      margin,
      onDragStop,
      onLayoutChange,
      rowHeight,
      resizeConfig,
      width,
    }: {
      children: ReactNode;
      containerPadding?: readonly [number, number];
      cols?: Record<string, number>;
      dragConfig?: {
        enabled?: boolean;
        handle?: string;
        cancel?: string;
      };
      margin?: readonly [number, number];
      onLayoutChange?: (
        layout: unknown[],
        layouts: Record<string, unknown[]>,
      ) => void;
      onDragStop?: (
        layout: unknown[],
        oldItem: unknown,
        newItem: unknown,
        placeholder: unknown,
        event: Event,
        element: HTMLElement | null,
      ) => void;
      resizeConfig?: {
        enabled?: boolean;
        handleComponent?: unknown;
        handles?: readonly string[];
      };
      rowHeight?: number;
      width?: number;
    }) => (
      <div
        data-testid="visual-grid"
        data-drag-enabled={String(dragConfig?.enabled)}
        data-drag-handle={dragConfig?.handle ?? ""}
        data-drag-cancel={dragConfig?.cancel ?? ""}
        data-container-padding={(containerPadding ?? []).join(",")}
        data-grid-cols={JSON.stringify(cols ?? {})}
        data-grid-width={String(width ?? "")}
        data-grid-margin={(margin ?? []).join(",")}
        data-row-height={String(rowHeight ?? "")}
        data-resize-enabled={String(resizeConfig?.enabled)}
        data-resize-handles={(resizeConfig?.handles ?? []).join(",")}
      >
        <button
          type="button"
          onClick={() =>
            onLayoutChange?.([], {
              lg: [
                { i: "insights", x: 0, y: 0, w: 4, h: 8 },
                { i: "summary", x: 4, y: 0, w: 8, h: 11 },
              ],
              md: [
                { i: "insights", x: 0, y: 0, w: 4, h: 8 },
                { i: "summary", x: 4, y: 0, w: 8, h: 10 },
              ],
              sm: [
                { i: "insights", x: 0, y: 0, w: 3, h: 7 },
                { i: "summary", x: 0, y: 7, w: 4, h: 9 },
              ],
              xs: [
                { i: "insights", x: 0, y: 0, w: 2, h: 7 },
                { i: "summary", x: 0, y: 7, w: 2, h: 8 },
              ],
            })
          }
        >
          mock layout change
        </button>
        <button
          type="button"
          onClick={() =>
            onDragStop?.(
              [
                { i: "insights", x: 0, y: 0, w: 4, h: 8 },
                { i: "summary", x: 4, y: 0, w: 8, h: 11 },
              ],
              null,
              null,
              null,
              new Event("mouseup"),
              null,
            )
          }
        >
          mock drag stop
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
            child.props.children,
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
    useContainerWidth: () => ({
      containerRef: { current: null },
      mounted: containerWidthMock.mounted,
      width: containerWidthMock.width,
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
        cards: Record<string, { height: string; visible: boolean; width: string }>;
        visual: { layouts: Record<string, Array<{ h: number; i: string; maxH?: number; maxW?: number; minH?: number; minW?: number; w: number; x: number; y: number }>> };
      })
    : null;
};

const readStoredLayoutItem = (cardId: string, breakpoint = "lg") =>
  readStoredPreferences()?.visual.layouts[breakpoint]?.find((item) => item.i === cardId);

const getFirstModuleChartCard = (diagnosis: ReturnType<typeof localDiagnosis>) => {
  const module = diagnosis.modules.find((item) => item.chart);

  if (!module?.chart) {
    throw new Error("Expected at least one module chart");
  }

  return {
    cardId: `module-chart:${module.id}`,
    module,
  };
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
    containerWidthMock.mounted = true;
    containerWidthMock.width = 1200;
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
    expect(screen.getByRole("button", { name: "标准" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "完整" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "动态" })).toBeInTheDocument();
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

  it("waits for measured Visual grid width before rendering the layout", () => {
    containerWidthMock.mounted = false;
    containerWidthMock.width = 0;

    renderDashboard();

    expect(screen.queryByTestId("visual-grid")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("拖动卡片：AI 诊断摘要"),
    ).not.toBeInTheDocument();
  });

  it("passes a rounded measured width to the Visual grid", () => {
    containerWidthMock.width = 1199.6;

    renderDashboard();

    const grid = screen.getByTestId("visual-grid");

    expect(grid).toHaveAttribute("data-grid-width", "1200");
    expect(grid.parentElement).toHaveAttribute("data-dashboard-breakpoint", "md");
    expect(grid.parentElement).toHaveAttribute("data-dashboard-cols", "8");
    expect(JSON.parse(grid.dataset.gridCols ?? "{}")).toMatchObject({ md: 8 });
    expect(grid).toHaveAttribute("data-row-height", "36");
    expect(grid).toHaveAttribute("data-grid-margin", "16,16");
    expect(grid).toHaveAttribute("data-container-padding", "0,0");
  });

  it("uses twelve Visual masonry columns at the 1200px threshold", () => {
    containerWidthMock.width = 1200;

    renderDashboard();

    const grid = screen.getByTestId("visual-grid");

    expect(grid.parentElement).toHaveAttribute("data-dashboard-breakpoint", "lg");
    expect(grid.parentElement).toHaveAttribute("data-dashboard-cols", "12");
    expect(JSON.parse(grid.dataset.gridCols ?? "{}")).toMatchObject({ lg: 12 });
  });

  it("hides horizontal Visual resize handles on the two-column mobile grid", () => {
    containerWidthMock.width = 375;

    renderDashboard();

    const grid = screen.getByTestId("visual-grid");

    expect(grid.parentElement).toHaveAttribute("data-dashboard-breakpoint", "xs");
    expect(grid.parentElement).toHaveAttribute("data-dashboard-cols", "2");
    expect(screen.queryByTestId("visual-resize-handle-summary-e")).not.toBeInTheDocument();
    expect(screen.getByTestId("visual-resize-handle-summary-s")).toBeInTheDocument();
  });

  it("moves the module mode indicator to the selected pill", async () => {
    const { onModuleLoadModeChange, rerenderMode } = renderDashboard();

    const indicator = screen.getByTestId("dashboard-mode-indicator");
    const completeButton = screen.getByRole("button", { name: "完整" });
    const adaptiveButton = screen.getByRole("button", { name: "动态" });

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
    const nextAdaptiveButton = screen.getByRole("button", { name: "动态" });
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

  it("shows module chart cards in Table and hides them from Visual", async () => {
    const { diagnosis, rerenderPanel } = renderDashboard({ panel: "table" });
    const { cardId, module } = getFirstModuleChartCard(diagnosis);

    expect(screen.getAllByText("模块图表").length).toBeGreaterThan(0);
    expect(screen.queryByText("已加载 AI 模块")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(`隐藏 ${module.chart!.title}`));

    await waitFor(() => {
      expect(readStoredPreferences()?.cards[cardId]?.visible).toBe(false);
    });

    rerenderPanel("overview");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: module.chart!.title })).not.toBeInTheDocument();
    });
  });

  it("uses current-breakpoint Table width and height grid steppers", async () => {
    renderDashboard({ panel: "table" });

    expect(screen.getByText("宽度(列)")).toBeInTheDocument();
    expect(screen.getByText("高度(行)")).toBeInTheDocument();

    const summaryWidthInput = screen.getByLabelText("设置「AI 诊断摘要」宽度列数");
    const summaryHeightInput = screen.getByLabelText("设置「AI 诊断摘要」高度行数");

    expect(summaryWidthInput).toHaveValue(8);
    expect(summaryHeightInput).toHaveValue(7);

    fireEvent.change(summaryWidthInput, {
      target: { value: "7" },
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary).toMatchObject({
        width: "large",
        height: "large",
      });
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: 7,
        maxH: 16,
        maxW: 12,
        minH: 6,
        minW: 3,
        w: 7,
      });
    });

    fireEvent.change(summaryHeightInput, {
      target: { value: "9" },
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary).toMatchObject({
        width: "large",
        height: "large",
      });
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: 9,
        maxH: 16,
        maxW: 12,
        minH: 6,
        minW: 3,
        w: 7,
      });
    });
  });

  it("clamps Table width controls to the active dynamic column count", async () => {
    containerWidthMock.width = 899.8;

    renderDashboard({ panel: "table" });

    const summaryWidthInput = screen.getByLabelText("设置「AI 诊断摘要」宽度列数");

    expect(summaryWidthInput).toHaveValue(4);
    expect(summaryWidthInput).toHaveAttribute("max", "4");

    fireEvent.change(summaryWidthInput, {
      target: { value: "8" },
    });

    await waitFor(() => {
      expect(readStoredLayoutItem("summary", "sm")).toMatchObject({
        maxW: 4,
        minW: 3,
        w: 4,
      });
    });
  });

  it("keeps missing module chart layouts when editing Table dimensions", async () => {
    const focusedDiagnosis = localDiagnosis(defaultCreatorId, "focused");
    const focusedViewModel = buildDashboardViewModel(focusedDiagnosis);
    const focusedCards = buildDashboardCards(focusedDiagnosis, focusedViewModel);
    const focusedCardIds = new Set(focusedCards.map((card) => card.id));
    const completeDiagnosis = localDiagnosis(defaultCreatorId, "complete");
    const completeViewModel = buildDashboardViewModel(completeDiagnosis);
    const completeCards = buildDashboardCards(completeDiagnosis, completeViewModel);
    const completeActions = buildDashboardActionCards(completeDiagnosis);
    const missingModuleChartCard = completeCards.find((card) => card.kind === "module-chart" && !focusedCardIds.has(card.id));

    expect(missingModuleChartCard).toBeDefined();

    const completePreferences = buildDefaultDashboardPreferences(defaultCreatorId, completeCards, completeActions, "2099-01-01T00:00:00.000Z");
    const missingLayout = {
      ...completePreferences.visual.layouts.lg.find((item) => item.i === missingModuleChartCard?.id)!,
      x: 8,
      y: 88,
    };
    window.localStorage.setItem(
      `creator-dashboard-preferences:${defaultCreatorId}:v1`,
      JSON.stringify({
        ...completePreferences,
        visual: {
          layouts: {
            ...completePreferences.visual.layouts,
            lg: [...completePreferences.visual.layouts.lg.filter((item) => item.i !== missingModuleChartCard?.id), missingLayout],
          },
        },
      }),
    );

    renderDashboard({ panel: "table", moduleLoadMode: "focused" });

    fireEvent.change(screen.getByLabelText("设置「AI 诊断摘要」宽度列数"), {
      target: { value: "7" },
    });

    await waitFor(() => {
      expect(readStoredLayoutItem(missingModuleChartCard!.id)).toEqual(missingLayout);
    });
  });

  it("ignores passive Visual layout reports and saves completed drags", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "mock layout change" }));

    expect(readStoredPreferences()?.visual.layouts.lg?.[0]).toMatchObject({
      i: "summary",
      x: 0,
      y: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: "mock drag stop" }));

    await waitFor(() => {
      expect(readStoredPreferences()?.visual.layouts.lg?.[0]).toMatchObject({
        i: "insights",
        x: 0,
        y: 0,
        w: 4,
        h: 8,
      });
    });
  });

  it("keeps resize handles separate from the Visual drag start target", () => {
    const { onAskAgent } = renderDashboard();

    const grid = screen.getByTestId("visual-grid");
    const handle = screen.getByLabelText("拖动卡片：AI 诊断摘要");
    const rightResizeHandle = screen.getByTestId("visual-resize-handle-summary-e");
    const bottomResizeHandle = screen.getByTestId("visual-resize-handle-summary-s");
    const askButton = screen.getByLabelText("询问 AI Agent：AI 诊断摘要");
    const resizeHandles = grid.dataset.resizeHandles?.split(",").filter(Boolean) ?? [];

    expect(grid).toHaveAttribute("data-drag-enabled", "true");
    expect(grid).toHaveAttribute("data-resize-enabled", "false");
    expect(resizeHandles).toEqual([]);
    expect(grid).toHaveAttribute(
      "data-drag-handle",
      ".dashboard-card-drag-handle",
    );
    expect(handle.matches(grid.dataset.dragHandle ?? "")).toBe(true);
    expect(handle.matches(grid.dataset.dragCancel ?? "")).toBe(false);
    expect(rightResizeHandle).toHaveClass(
      "react-resizable-handle",
      "dashboard-card-resize-handle",
      "dashboard-card-resize-edge--e",
    );
    expect(rightResizeHandle.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(rightResizeHandle.matches(grid.dataset.dragCancel ?? "")).toBe(true);
    expect(bottomResizeHandle).toHaveClass(
      "react-resizable-handle",
      "dashboard-card-resize-handle",
      "dashboard-card-resize-edge--s",
    );
    expect(bottomResizeHandle.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(bottomResizeHandle.matches(grid.dataset.dragCancel ?? "")).toBe(true);
    expect(askButton.matches(grid.dataset.dragHandle ?? "")).toBe(false);
    expect(askButton.matches(grid.dataset.dragCancel ?? "")).toBe(true);

    fireEvent.click(askButton);

    expect(onAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "AI 诊断摘要" }),
    );
  });

  it("starts Visual cards from presets while leaving grid dimensions resizable", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: 7,
        maxH: 16,
        maxW: 12,
        minH: 6,
        minW: 3,
        w: 8,
      });
    });
  });

  it("resizes cards whose Visual layout is filled at render time", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId, "focused");
    const viewModel = buildDashboardViewModel(diagnosis);
    const cards = buildDashboardCards(diagnosis, viewModel);
    const actions = buildDashboardActionCards(diagnosis);
    const defaultPreferences = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2099-01-01T00:00:00.000Z");
    let preferences: DashboardPreferencesV1 = {
      ...defaultPreferences,
      visual: {
        layouts: {
          ...defaultPreferences.visual.layouts,
          lg: defaultPreferences.visual.layouts.lg.filter((item) => item.i !== "summary"),
        },
      },
    };
    const updatePreferences = vi.fn((updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => {
      preferences = updater(preferences);
    });

    render(
      <VisualDashboardView
        actions={actions}
        cards={cards}
        diagnosis={diagnosis}
        onAsk={vi.fn()}
        preferences={preferences}
        updatePreferences={updatePreferences}
        viewModel={viewModel}
      />,
    );

    expect(preferences.visual.layouts.lg.some((item) => item.i === "summary")).toBe(false);

    const rightResizeHandle = screen.getByTestId("visual-resize-handle-summary-e");

    fireEvent.pointerDown(rightResizeHandle, {
      button: 0,
      clientX: 220,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 1,
    });

    expect(updatePreferences).toHaveBeenCalled();
    expect(preferences.cards.summary).toMatchObject({
      width: "large",
      height: "large",
    });
    expect(preferences.visual.layouts.lg.find((item) => item.i === "summary")).toMatchObject({
      h: 7,
      maxH: 16,
      maxW: 12,
      minH: 6,
      minW: 3,
      w: 7,
    });
  });

  it("resizes the right edge one grid column at a time without changing height", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary).toMatchObject({
        width: "large",
        height: "large",
      });
    });

    const rightResizeHandle = screen.getByTestId("visual-resize-handle-summary-e");

    fireEvent.pointerDown(rightResizeHandle, {
      button: 0,
      clientX: 220,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary).toMatchObject({
        width: "large",
        height: "large",
      });
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: 7,
        maxH: 16,
        maxW: 12,
        minH: 6,
        minW: 3,
        w: 7,
      });
    });

    fireEvent.pointerDown(rightResizeHandle, {
      button: 0,
      clientX: 220,
      clientY: 0,
      pointerId: 2,
    });
    fireEvent.pointerMove(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 2,
    });
    fireEvent.pointerUp(rightResizeHandle, {
      clientX: 100,
      clientY: 0,
      pointerId: 2,
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards.summary).toMatchObject({
        width: "large",
        height: "large",
      });
      expect(readStoredLayoutItem("summary")).toMatchObject({
        h: 7,
        maxH: 16,
        maxW: 12,
        minH: 6,
        minW: 3,
        w: 6,
      });
    });
  });

  it("resizes the bottom edge one grid row at a time without changing width", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(readStoredPreferences()?.cards["metric:views7d"]).toMatchObject({
        width: "small",
        height: "small",
      });
    });

    const bottomResizeHandle = screen.getByTestId("visual-resize-handle-metric:views7d-s");

    fireEvent.pointerDown(bottomResizeHandle, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });
    fireEvent.pointerUp(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards["metric:views7d"]).toMatchObject({
        width: "small",
        height: "small",
      });
      expect(readStoredLayoutItem("metric:views7d")).toMatchObject({
        h: 6,
        maxH: 16,
        maxW: 12,
        minH: 5,
        minW: 2,
        w: 3,
      });
    });

    fireEvent.pointerDown(bottomResizeHandle, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 2,
    });
    fireEvent.pointerMove(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 2,
    });
    fireEvent.pointerUp(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 2,
    });

    await waitFor(() => {
      expect(readStoredPreferences()?.cards["metric:views7d"]).toMatchObject({
        width: "small",
        height: "small",
      });
      expect(readStoredLayoutItem("metric:views7d")).toMatchObject({
        h: 7,
        maxH: 16,
        maxW: 12,
        minH: 5,
        minW: 2,
        w: 3,
      });
    });
  });

  it("saves module chart card resizing from the Visual grid", async () => {
    const { diagnosis } = renderDashboard();
    const { cardId } = getFirstModuleChartCard(diagnosis);

    await waitFor(() => {
      expect(readStoredPreferences()?.cards[cardId]).toMatchObject({
        width: "medium",
        height: "medium",
      });
      expect(readStoredLayoutItem(cardId)).toMatchObject({
        h: 8,
        maxH: 16,
        minH: 6,
        minW: 3,
        w: 4,
      });
    });

    const bottomResizeHandle = screen.getByTestId(`visual-resize-handle-${cardId}-s`);

    fireEvent.pointerDown(bottomResizeHandle, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });
    fireEvent.pointerUp(bottomResizeHandle, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(readStoredLayoutItem(cardId)).toMatchObject({
        h: 9,
        maxH: 16,
        minH: 6,
        minW: 3,
        w: 4,
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
