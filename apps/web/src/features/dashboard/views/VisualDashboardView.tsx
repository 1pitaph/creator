import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

import {
  moveElement,
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts
} from "react-grid-layout";

import type { DashboardBreakpoint, DashboardCardSize, DashboardGridItem, DashboardPreferencesV1, DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../../types";
import {
  dashboardBreakpoints,
  dashboardColumnCounts,
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
  nextLayouts: ResponsiveLayouts<DashboardBreakpoint>,
  visibleIds: Set<string>
) =>
  dashboardBreakpoints.some((breakpoint) => {
    const currentVisibleLayout = currentLayouts[breakpoint].filter((item) => visibleIds.has(item.i));
    const nextVisibleLayout = toStoredGridItemsForBreakpoint(nextLayouts, breakpoint);

    return !areGridItemsEqual(currentVisibleLayout, nextVisibleLayout);
  });

const mergeStoredLayouts = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  nextLayouts: ResponsiveLayouts<DashboardBreakpoint>,
  visibleIds: Set<string>
): DashboardPreferencesV1["visual"]["layouts"] =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => {
      const nextVisibleLayout = toStoredGridItemsForBreakpoint(nextLayouts, breakpoint);
      const currentHiddenLayout = currentLayouts[breakpoint].filter((item) => !visibleIds.has(item.i));

      return [breakpoint, [...nextVisibleLayout, ...currentHiddenLayout]];
    })
  ) as DashboardPreferencesV1["visual"]["layouts"];

const moveDashboardGridItem = ({
  cardId,
  cols,
  layout,
  x,
  y
}: {
  cardId: string;
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

  return toStoredGridItems(verticalCompactor.compact(movedLayout, cols));
};

const resizeDashboardGridItem = ({
  cardId,
  cols,
  h,
  layout,
  w
}: {
  cardId: string;
  cols: number;
  h: number;
  layout: DashboardGridItem[];
  w: number;
}): DashboardGridItem[] => {
  const nextLayout = layout.map((item) => ({ ...item })) as Layout;
  const item = nextLayout.find((layoutItem) => layoutItem.i === cardId);

  if (!item) {
    return layout;
  }

  item.w = clamp(w, item.minW ?? 1, Math.min(item.maxW ?? cols, cols - item.x));
  item.h = clamp(h, item.minH ?? 1, item.maxH ?? Number.POSITIVE_INFINITY);

  return toStoredGridItems(verticalCompactor.compact(nextLayout, cols));
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
    [breakpoint, preferences.visual.layouts, updatePreferences, width]
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

      const cardElement = resizeHandle.closest<HTMLElement>("[data-dashboard-card-id]");
      const cardId = cardElement?.dataset.dashboardCardId;

      if (!cardId) {
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
      let lastW = startItem.w;
      let lastH = startItem.h;

      resizeHandle.setPointerCapture(pointerId);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();

        const nextW = clamp(startItem.w + Math.round((pointerEvent.clientX - startClientX) / columnStep), startItem.minW ?? 1, Math.min(startItem.maxW ?? cols, cols - startItem.x));
        const nextH = clamp(startItem.h + Math.round((pointerEvent.clientY - startClientY) / rowStep), startItem.minH ?? 1, startItem.maxH ?? Number.POSITIVE_INFINITY);

        if (nextW === lastW && nextH === lastH) {
          return;
        }

        lastW = nextW;
        lastH = nextH;

        updatePreferences((current) => ({
          ...current,
          visual: {
            layouts: {
              ...current.visual.layouts,
              [breakpoint]: resizeDashboardGridItem({
                cardId,
                cols,
                h: nextH,
                layout: current.visual.layouts[breakpoint],
                w: nextW
              })
            }
          }
        }));
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
    [breakpoint, preferences.visual.layouts, updatePreferences, width]
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
            handles: ["se"]
          }}
          onLayoutChange={(_, nextLayouts) => {
            if (!hasStoredLayoutChanges(preferences.visual.layouts, nextLayouts, visibleIds)) {
              return;
            }

            const mergedLayouts = mergeStoredLayouts(preferences.visual.layouts, nextLayouts, visibleIds);

            updatePreferences((current) => ({
              ...current,
              visual: {
                layouts: mergedLayouts
              }
            }));
          }}
        >
          {visibleCards.map((card) => {
            const size = preferences.cards[card.id]?.size ?? card.defaultSize;

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
                  size={size as DashboardCardSize}
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
