import "react-grid-layout/css/styles.css";

import { useCallback, type PointerEvent as ReactPointerEvent, type Ref } from "react";

import {
  moveElement,
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type ResizeHandleAxis,
  type ResponsiveLayouts
} from "react-grid-layout";

import type { DashboardBreakpoint, DashboardCardSize, DashboardGridItem, DashboardPreferencesV1, DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../../types";
import {
  createDashboardLayout,
  createDashboardLayouts,
  dashboardCardSizeOrder,
  dashboardBreakpoints,
  dashboardColumnCounts,
  getDashboardCardContentSize,
  normalizeDashboardCardDimensions,
  orderDashboardCardsByLayout,
  type DashboardActionCard,
  type DashboardCardDefinition
} from "../customization";
import { DashboardCardRenderer } from "../components/DashboardCardRenderer";

const breakpoints: Record<DashboardBreakpoint, number> = {
  lg: 1200,
  md: 900,
  sm: 640,
  xs: 0
};

const visualGridMargin: [number, number] = [16, 16];
const visualGridRowHeight = 36;
const visualResizeHandles = ["e", "s"] as const satisfies readonly ResizeHandleAxis[];
type DashboardResizeAxis = (typeof visualResizeHandles)[number];

const isDashboardResizeAxis = (axis: string | null | undefined): axis is DashboardResizeAxis => axis === "e" || axis === "s";

const renderDashboardResizeHandle = (axis: ResizeHandleAxis, ref: Ref<HTMLElement>) => {
  if (!isDashboardResizeAxis(axis)) {
    return null;
  }

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`react-resizable-handle react-resizable-handle-${axis} dashboard-card-resize-edge dashboard-card-resize-edge--${axis}`}
      data-dashboard-resize-axis={axis}
    />
  );
};

const getBreakpointForWidth = (width: number): DashboardBreakpoint => {
  if (width >= breakpoints.lg) {
    return "lg";
  }

  if (width >= breakpoints.md) {
    return "md";
  }

  if (width >= breakpoints.sm) {
    return "sm";
  }

  return "xs";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toStoredGridItems = (layout: Layout): DashboardGridItem[] =>
  layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH
  }));

const toResponsiveLayouts = (
  preferences: DashboardPreferencesV1,
  visibleIds: Set<string>
): ResponsiveLayouts<DashboardBreakpoint> =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => [
      breakpoint,
      preferences.visual.layouts[breakpoint].filter((item) => visibleIds.has(item.i)) as Layout
    ])
  ) as ResponsiveLayouts<DashboardBreakpoint>;

const toStoredGridItemsForBreakpoint = (layouts: ResponsiveLayouts<DashboardBreakpoint>, breakpoint: DashboardBreakpoint) =>
  toStoredGridItems([...(layouts[breakpoint] ?? [])] as Layout);

const areGridItemsEqual = (left: DashboardGridItem[], right: DashboardGridItem[]) =>
  left.length === right.length &&
  left.every((item, index) => {
    const nextItem = right[index];

    return (
      nextItem &&
      item.i === nextItem.i &&
      item.x === nextItem.x &&
      item.y === nextItem.y &&
      item.w === nextItem.w &&
      item.h === nextItem.h &&
      item.minW === nextItem.minW &&
      item.minH === nextItem.minH &&
      item.maxW === nextItem.maxW &&
      item.maxH === nextItem.maxH
    );
  });

const hasStoredLayoutChanges = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  nextLayouts: DashboardPreferencesV1["visual"]["layouts"]
) =>
  dashboardBreakpoints.some((breakpoint) => {
    return !areGridItemsEqual(currentLayouts[breakpoint], nextLayouts[breakpoint]);
  });

const createPresetLayoutsFromResponsiveLayouts = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  nextLayouts: ResponsiveLayouts<DashboardBreakpoint>,
  visibleIds: Set<string>,
  cards: DashboardCardDefinition[],
  cardPreferences: DashboardPreferencesV1["cards"]
): DashboardPreferencesV1["visual"]["layouts"] =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => {
      const nextVisibleLayout = toStoredGridItemsForBreakpoint(nextLayouts, breakpoint);
      const currentHiddenLayout = currentLayouts[breakpoint].filter((item) => !visibleIds.has(item.i));
      const orderedCards = orderDashboardCardsByLayout(cards, [...nextVisibleLayout, ...currentHiddenLayout]);

      return [breakpoint, createDashboardLayout(orderedCards, breakpoint, cardPreferences)];
    })
  ) as DashboardPreferencesV1["visual"]["layouts"];

const moveDashboardGridItem = ({
  cardId,
  cards,
  breakpoint,
  cardPreferences,
  cols,
  layout,
  x,
  y
}: {
  cardId: string;
  cards: DashboardCardDefinition[];
  breakpoint: DashboardBreakpoint;
  cardPreferences: DashboardPreferencesV1["cards"];
  cols: number;
  layout: DashboardGridItem[];
  x: number;
  y: number;
}): DashboardGridItem[] => {
  const nextLayout = layout.map((item) => ({ ...item })) as Layout;
  const item = nextLayout.find((layoutItem) => layoutItem.i === cardId);

  if (!item) {
    return layout;
  }

  const nextX = clamp(x, 0, Math.max(0, cols - item.w));
  const nextY = Math.max(0, y);
  const movedLayout = moveElement(nextLayout, item, nextX, nextY, true, false, "vertical", cols, false) as Layout;
  const orderedCards = orderDashboardCardsByLayout(cards, toStoredGridItems(movedLayout));

  return createDashboardLayout(orderedCards, breakpoint, cardPreferences);
};

const getCardPresetAtDelta = (startSize: DashboardCardSize, delta: number) => {
  const startIndex = dashboardCardSizeOrder.indexOf(startSize);
  const nextIndex = clamp(startIndex + delta, 0, dashboardCardSizeOrder.length - 1);

  return dashboardCardSizeOrder[nextIndex] ?? startSize;
};

export const VisualDashboardView = ({
  actions,
  cards,
  diagnosis,
  onAsk,
  preferences,
  updatePreferences,
  viewModel
}: {
  actions: DashboardActionCard[];
  cards: DashboardCardDefinition[];
  diagnosis: DiagnosisResponse;
  onAsk: (target: AskTarget) => void;
  preferences: DashboardPreferencesV1;
  updatePreferences: (updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => void;
  viewModel: DashboardViewModel;
}) => {
  const { containerRef, mounted, width } = useContainerWidth({ initialWidth: 1200 });
  const visibleCards = cards.filter((card) => preferences.cards[card.id]?.visible !== false);
  const visibleIds = new Set(visibleCards.map((card) => card.id));
  const layouts = toResponsiveLayouts(preferences, visibleIds);
  const breakpoint = getBreakpointForWidth(width);

  const handleDragHandlePointerDown = useCallback(
    (cardId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      const currentLayout = preferences.visual.layouts[breakpoint];
      const startItem = currentLayout.find((item) => item.i === cardId);

      if (!startItem) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const cols = dashboardColumnCounts[breakpoint];
      const colWidth = (width - visualGridMargin[0] * (cols - 1)) / cols;
      const columnStep = colWidth + visualGridMargin[0];
      const rowStep = visualGridRowHeight + visualGridMargin[1];
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      let lastX = startItem.x;
      let lastY = startItem.y;

      handle.setPointerCapture(pointerId);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();

        const nextX = clamp(startItem.x + Math.round((pointerEvent.clientX - startClientX) / columnStep), 0, Math.max(0, cols - startItem.w));
        const nextY = Math.max(0, startItem.y + Math.round((pointerEvent.clientY - startClientY) / rowStep));

        if (nextX === lastX && nextY === lastY) {
          return;
        }

        lastX = nextX;
        lastY = nextY;

        updatePreferences((current) => ({
          ...current,
          visual: {
            layouts: {
              ...current.visual.layouts,
              [breakpoint]: moveDashboardGridItem({
                cardId,
                cards,
                breakpoint,
                cardPreferences: current.cards,
                cols,
                layout: current.visual.layouts[breakpoint],
                x: nextX,
                y: nextY
              })
            }
          }
        }));
      };

      const stopDragging = (pointerEvent: PointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        handle.removeEventListener("pointermove", handlePointerMove);
        handle.removeEventListener("pointerup", stopDragging);
        handle.removeEventListener("pointercancel", stopDragging);

        if (handle.hasPointerCapture(pointerId)) {
          handle.releasePointerCapture(pointerId);
        }
      };

      handle.addEventListener("pointermove", handlePointerMove);
      handle.addEventListener("pointerup", stopDragging);
      handle.addEventListener("pointercancel", stopDragging);
    },
    [breakpoint, cards, preferences.visual.layouts, updatePreferences, width]
  );

  const handleResizeHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !(event.target instanceof HTMLElement)) {
        return;
      }

      const resizeHandle = event.target.closest<HTMLElement>(".react-resizable-handle");

      if (!resizeHandle) {
        return;
      }

      const resizeAxis = resizeHandle.dataset.dashboardResizeAxis;

      if (!isDashboardResizeAxis(resizeAxis)) {
        return;
      }

      const cardElement = resizeHandle.closest<HTMLElement>("[data-dashboard-card-id]");
      const cardId = cardElement?.dataset.dashboardCardId;
      const card = cards.find((item) => item.id === cardId);

      if (!cardId || !card) {
        return;
      }

      const currentLayout = preferences.visual.layouts[breakpoint];
      const startItem = currentLayout.find((item) => item.i === cardId);

      if (!startItem) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pointerId = event.pointerId;
      const cols = dashboardColumnCounts[breakpoint];
      const colWidth = (width - visualGridMargin[0] * (cols - 1)) / cols;
      const columnStep = colWidth + visualGridMargin[0];
      const rowStep = visualGridRowHeight + visualGridMargin[1];
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startDimensions = normalizeDashboardCardDimensions(preferences.cards[cardId], card.defaultSize);
      const startPreset = resizeAxis === "e" ? startDimensions.width : startDimensions.height;
      let lastPreset = startPreset;

      resizeHandle.setPointerCapture(pointerId);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();

        const delta =
          resizeAxis === "e"
            ? Math.round((pointerEvent.clientX - startClientX) / columnStep)
            : Math.round((pointerEvent.clientY - startClientY) / rowStep);
        const nextPreset = getCardPresetAtDelta(startPreset, delta);

        if (nextPreset === lastPreset) {
          return;
        }

        lastPreset = nextPreset;

        updatePreferences((current) => {
          const currentDimensions = normalizeDashboardCardDimensions(current.cards[cardId], card.defaultSize);
          const nextDimensions =
            resizeAxis === "e"
              ? {
                  ...currentDimensions,
                  width: nextPreset
                }
              : {
                  ...currentDimensions,
                  height: nextPreset
                };
          const nextCards = {
            ...current.cards,
            [cardId]: {
              ...current.cards[cardId],
              visible: current.cards[cardId]?.visible ?? true,
              ...nextDimensions
            }
          };

          return {
            ...current,
            cards: nextCards,
            visual: {
              layouts: createDashboardLayouts(cards, nextCards, current.visual.layouts)
            }
          };
        });
      };

      const stopResizing = (pointerEvent: PointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        resizeHandle.removeEventListener("pointermove", handlePointerMove);
        resizeHandle.removeEventListener("pointerup", stopResizing);
        resizeHandle.removeEventListener("pointercancel", stopResizing);

        if (resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
      };

      resizeHandle.addEventListener("pointermove", handlePointerMove);
      resizeHandle.addEventListener("pointerup", stopResizing);
      resizeHandle.addEventListener("pointercancel", stopResizing);
    },
    [breakpoint, cards, preferences.cards, preferences.visual.layouts, updatePreferences, width]
  );

  return (
    <div ref={containerRef} onPointerDownCapture={handleResizeHandlePointerDown}>
      {mounted ? (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={width}
          breakpoints={breakpoints}
          cols={dashboardColumnCounts}
          layouts={layouts}
          rowHeight={visualGridRowHeight}
          margin={visualGridMargin}
          containerPadding={[0, 0]}
          autoSize
          dragConfig={{
            enabled: true,
            bounded: true,
            handle: ".dashboard-card-drag-handle",
            cancel: "button:not(.dashboard-card-drag-handle), input, select, textarea, [data-no-drag], .react-resizable-handle",
            threshold: 4
          }}
          resizeConfig={{
            enabled: true,
            handleComponent: renderDashboardResizeHandle,
            handles: visualResizeHandles
          }}
          onLayoutChange={(_, nextLayouts) => {
            const presetLayouts = createPresetLayoutsFromResponsiveLayouts(preferences.visual.layouts, nextLayouts, visibleIds, cards, preferences.cards);

            if (!hasStoredLayoutChanges(preferences.visual.layouts, presetLayouts)) {
              return;
            }

            updatePreferences((current) => ({
              ...current,
              visual: {
                layouts: createPresetLayoutsFromResponsiveLayouts(current.visual.layouts, nextLayouts, visibleIds, cards, current.cards)
              }
            }));
          }}
        >
          {visibleCards.map((card) => {
            const dimensions = normalizeDashboardCardDimensions(preferences.cards[card.id], card.defaultSize);
            const contentSize = getDashboardCardContentSize(dimensions);

            return (
              <div key={card.id} className="min-h-0" data-dashboard-card-id={card.id}>
                <DashboardCardRenderer
                  actions={actions}
                  card={card}
                  diagnosis={diagnosis}
                  fill
                  onAsk={onAsk}
                  onDragHandlePointerDown={(event) => handleDragHandlePointerDown(card.id, event)}
                  showDragHandle
                  size={contentSize}
                  viewModel={viewModel}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
};
