import "react-grid-layout/css/styles.css";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type ResponsiveLayouts
} from "react-grid-layout";

import type { DashboardBreakpoint, DashboardCardSize, DashboardGridItem, DashboardPreferencesV1, DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../../types";
import {
  createDashboardGridItem,
  createDashboardLayouts,
  dashboardCardSizeOrder,
  dashboardBreakpoints,
  dashboardColumnCounts,
  getDashboardCardContentSize,
  normalizeDashboardCardDimensions,
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
const visualResizeHandles = ["e", "s"] as const;
type DashboardResizeAxis = (typeof visualResizeHandles)[number];

const isDashboardResizeAxis = (axis: string | null | undefined): axis is DashboardResizeAxis => axis === "e" || axis === "s";

const DashboardResizeHandles = ({ cardId }: { cardId: string }) => (
  <>
    {visualResizeHandles.map((axis) => (
      <span
        key={axis}
        aria-hidden="true"
        className={`react-resizable-handle react-resizable-handle-${axis} dashboard-card-resize-edge dashboard-card-resize-edge--${axis}`}
        data-dashboard-resize-axis={axis}
        data-testid={`visual-resize-handle-${cardId}-${axis}`}
      />
    ))}
  </>
);

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

const areGridItemsEqual = (left: DashboardGridItem[], right: DashboardGridItem[]) =>
  left.length === right.length && (() => {
    const rightById = new Map(right.map((item) => [item.i, item]));

    return left.every((item) => {
      const nextItem = rightById.get(item.i);

      return (
        nextItem &&
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
  })();

const hasStoredLayoutChanges = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  nextLayouts: DashboardPreferencesV1["visual"]["layouts"]
) =>
  dashboardBreakpoints.some((breakpoint) => {
    return !areGridItemsEqual(currentLayouts[breakpoint], nextLayouts[breakpoint]);
  });

const normalizeStoredGridItem = (
  item: DashboardGridItem,
  breakpoint: DashboardBreakpoint,
  card: DashboardCardDefinition,
  cardPreferences: DashboardPreferencesV1["cards"]
): DashboardGridItem => {
  const dimensions = normalizeDashboardCardDimensions(cardPreferences[card.id], card.defaultSize);
  const presetItem = createDashboardGridItem(card, breakpoint, item.x, item.y, dimensions);
  const maxX = Math.max(dashboardColumnCounts[breakpoint] - presetItem.w, 0);

  return {
    ...presetItem,
    x: clamp(item.x, 0, maxX),
    y: Math.max(item.y, 0)
  };
};

const createStoredLayoutForBreakpoint = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  breakpoint: DashboardBreakpoint,
  nextLayout: Layout,
  visibleIds: Set<string>,
  cards: DashboardCardDefinition[],
  cardPreferences: DashboardPreferencesV1["cards"]
): DashboardGridItem[] => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nextVisibleLayout = toStoredGridItems(nextLayout).flatMap((item) => {
    if (!visibleIds.has(item.i)) {
      return [];
    }

    const card = cardById.get(item.i);
    return card ? [normalizeStoredGridItem(item, breakpoint, card, cardPreferences)] : [];
  });
  const nextVisibleIds = new Set(nextVisibleLayout.map((item) => item.i));
  const currentVisibleLayout = currentLayouts[breakpoint].flatMap((item) => {
    if (!visibleIds.has(item.i) || nextVisibleIds.has(item.i)) {
      return [];
    }

    const card = cardById.get(item.i);
    return card ? [normalizeStoredGridItem(item, breakpoint, card, cardPreferences)] : [];
  });
  const currentHiddenLayout = currentLayouts[breakpoint].filter((item) => !visibleIds.has(item.i));

  return [...nextVisibleLayout, ...currentVisibleLayout, ...currentHiddenLayout];
};

const createStoredLayoutsForBreakpoint = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  breakpoint: DashboardBreakpoint,
  nextLayout: Layout,
  visibleIds: Set<string>,
  cards: DashboardCardDefinition[],
  cardPreferences: DashboardPreferencesV1["cards"]
): DashboardPreferencesV1["visual"]["layouts"] => ({
  ...currentLayouts,
  [breakpoint]: createStoredLayoutForBreakpoint(currentLayouts, breakpoint, nextLayout, visibleIds, cards, cardPreferences)
});

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
  const { containerRef, mounted, width } = useContainerWidth({ measureBeforeMount: true, initialWidth: 0 });
  const measuredWidth = Math.round(width);
  const gridReady = mounted && measuredWidth > 0;
  const visibleCards = cards.filter((card) => preferences.cards[card.id]?.visible !== false);
  const visibleIds = new Set(visibleCards.map((card) => card.id));
  const layouts = toResponsiveLayouts(preferences, visibleIds);
  const breakpoint = getBreakpointForWidth(measuredWidth);

  const commitLayoutForBreakpoint = useCallback(
    (nextLayout: Layout) => {
      updatePreferences((current) => {
        const nextLayouts = createStoredLayoutsForBreakpoint(current.visual.layouts, breakpoint, nextLayout, visibleIds, cards, current.cards);

        if (!hasStoredLayoutChanges(current.visual.layouts, nextLayouts)) {
          return current;
        }

        return {
          ...current,
          visual: {
            layouts: nextLayouts
          }
        };
      });
    },
    [breakpoint, cards, updatePreferences, visibleIds]
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
      const colWidth = (measuredWidth - visualGridMargin[0] * (cols - 1)) / cols;
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
    [breakpoint, cards, measuredWidth, preferences.cards, preferences.visual.layouts, updatePreferences]
  );

  return (
    <div ref={containerRef} className="dashboard-visual-grid-shell" onPointerDownCapture={handleResizeHandlePointerDown}>
      {gridReady ? (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={measuredWidth}
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
            enabled: false
          }}
          onDragStop={(nextLayout) => commitLayoutForBreakpoint(nextLayout)}
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
                  showDragHandle
                  size={contentSize}
                  viewModel={viewModel}
                />
                <DashboardResizeHandles cardId={card.id} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
};
