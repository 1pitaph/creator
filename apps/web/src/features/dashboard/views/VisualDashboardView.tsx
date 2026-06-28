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

const toStoredLayouts = (layouts: ResponsiveLayouts<DashboardBreakpoint>): DashboardPreferencesV1["visual"]["layouts"] =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => [
      breakpoint,
      toStoredGridItems([...(layouts[breakpoint] ?? [])] as Layout)
    ])
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

export const VisualDashboardView = ({
  actions,
  cards,
  diagnosis,
  editing,
  onAsk,
  preferences,
  updatePreferences,
  viewModel
}: {
  actions: DashboardActionCard[];
  cards: DashboardCardDefinition[];
  diagnosis: DiagnosisResponse;
  editing: boolean;
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
      if (!editing || event.button !== 0) {
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
    [breakpoint, editing, preferences.visual.layouts, updatePreferences, width]
  );

  return (
    <div ref={containerRef}>
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
            enabled: editing,
            bounded: true,
            handle: ".dashboard-card-drag-handle",
            cancel: "button:not(.dashboard-card-drag-handle), input, select, textarea, [data-no-drag], .react-resizable-handle",
            threshold: 4
          }}
          resizeConfig={{
            enabled: editing,
            handles: ["se"]
          }}
          onLayoutChange={(_, nextLayouts) => {
            if (!editing) {
              return;
            }

            updatePreferences((current) => ({
              ...current,
              visual: {
                layouts: toStoredLayouts(nextLayouts)
              }
            }));
          }}
        >
          {visibleCards.map((card) => {
            const size = preferences.cards[card.id]?.size ?? card.defaultSize;

            return (
              <div key={card.id} className="min-h-0">
                <DashboardCardRenderer
                  actions={actions}
                  card={card}
                  diagnosis={diagnosis}
                  fill
                  onAsk={onAsk}
                  onDragHandlePointerDown={(event) => handleDragHandlePointerDown(card.id, event)}
                  showDragHandle={editing}
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
