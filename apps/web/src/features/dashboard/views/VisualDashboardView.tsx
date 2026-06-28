import "react-grid-layout/css/styles.css";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts
} from "react-grid-layout";

import type { DashboardBreakpoint, DashboardGridItem, DashboardPreferencesV1, DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../../types";
import {
  createDashboardGridItem,
  dashboardBreakpointWidths,
  dashboardBreakpoints,
  dashboardColumnCounts,
  getDashboardBreakpointForWidth,
  getDashboardCardContentSizeForGridItem,
  getDashboardCardGridConstraints,
  normalizeDashboardGridItem,
  normalizeDashboardCardDimensions,
  type DashboardActionCard,
  type DashboardCardDefinition
} from "../customization";
import { DashboardCardRenderer } from "../components/DashboardCardRenderer";

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
  card: DashboardCardDefinition
): DashboardGridItem => {
  return normalizeDashboardGridItem(item, breakpoint, card);
};

const createStoredLayoutForBreakpoint = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  breakpoint: DashboardBreakpoint,
  nextLayout: Layout,
  visibleIds: Set<string>,
  cards: DashboardCardDefinition[]
): DashboardGridItem[] => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nextVisibleLayout = toStoredGridItems(nextLayout).flatMap((item) => {
    if (!visibleIds.has(item.i)) {
      return [];
    }

    const card = cardById.get(item.i);
    return card ? [normalizeStoredGridItem(item, breakpoint, card)] : [];
  });
  const nextVisibleIds = new Set(nextVisibleLayout.map((item) => item.i));
  const currentVisibleLayout = currentLayouts[breakpoint].flatMap((item) => {
    if (!visibleIds.has(item.i) || nextVisibleIds.has(item.i)) {
      return [];
    }

    const card = cardById.get(item.i);
    return card ? [normalizeStoredGridItem(item, breakpoint, card)] : [];
  });
  const currentHiddenLayout = currentLayouts[breakpoint].filter((item) => !visibleIds.has(item.i));

  return [...nextVisibleLayout, ...currentVisibleLayout, ...currentHiddenLayout];
};

const createStoredLayoutsForBreakpoint = (
  currentLayouts: DashboardPreferencesV1["visual"]["layouts"],
  breakpoint: DashboardBreakpoint,
  nextLayout: Layout,
  visibleIds: Set<string>,
  cards: DashboardCardDefinition[]
): DashboardPreferencesV1["visual"]["layouts"] => ({
  ...currentLayouts,
  [breakpoint]: createStoredLayoutForBreakpoint(currentLayouts, breakpoint, nextLayout, visibleIds, cards)
});

const compactDashboardGridItems = (
  layout: DashboardGridItem[],
  breakpoint: DashboardBreakpoint,
  cards: DashboardCardDefinition[]
) => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const normalizedLayout = layout.flatMap((item) => {
    const card = cardById.get(item.i);

    return card ? [normalizeDashboardGridItem(item, breakpoint, card)] : [];
  });

  return toStoredGridItems(verticalCompactor.compact(normalizedLayout as Layout, dashboardColumnCounts[breakpoint]) as Layout).flatMap((item) => {
    const card = cardById.get(item.i);

    return card ? [normalizeDashboardGridItem(item, breakpoint, card)] : [];
  });
};

const resizeDashboardGridItem = ({
  breakpoint,
  cardId,
  cards,
  h,
  layout,
  w
}: {
  breakpoint: DashboardBreakpoint;
  cardId: string;
  cards: DashboardCardDefinition[];
  h: number;
  layout: DashboardGridItem[];
  w: number;
}) => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nextLayout = layout.map((item) => ({ ...item }));
  const itemIndex = nextLayout.findIndex((item) => item.i === cardId);

  if (itemIndex === -1) {
    return layout;
  }

  const card = cardById.get(cardId);

  if (!card) {
    return layout;
  }

  const currentItem = nextLayout[itemIndex];

  if (!currentItem) {
    return layout;
  }

  const item = normalizeDashboardGridItem(currentItem, breakpoint, card);
  const constraints = getDashboardCardGridConstraints(card, breakpoint);
  const maxWidthAtX = Math.max(constraints.minW, Math.min(constraints.maxW, dashboardColumnCounts[breakpoint] - item.x));
  nextLayout[itemIndex] = {
    ...item,
    w: clamp(w, constraints.minW, maxWidthAtX),
    h: clamp(h, constraints.minH, constraints.maxH)
  };

  return compactDashboardGridItems(nextLayout, breakpoint, cards);
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
  const breakpoint = getDashboardBreakpointForWidth(measuredWidth);

  const commitLayoutForBreakpoint = useCallback(
    (nextLayout: Layout) => {
      updatePreferences((current) => {
        const nextLayouts = createStoredLayoutsForBreakpoint(current.visual.layouts, breakpoint, nextLayout, visibleIds, cards);

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
      const colWidth = (measuredWidth - visualGridMargin[0] * (cols - 1)) / cols;
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

        const nextW =
          resizeAxis === "e"
            ? startItem.w + Math.round((pointerEvent.clientX - startClientX) / columnStep)
            : startItem.w;
        const nextH =
          resizeAxis === "s"
            ? startItem.h + Math.round((pointerEvent.clientY - startClientY) / rowStep)
            : startItem.h;

        if (nextW === lastW && nextH === lastH) {
          return;
        }

        lastW = nextW;
        lastH = nextH;

        updatePreferences((current) => {
          const currentVisibleLayout = current.visual.layouts[breakpoint].filter((item) => visibleIds.has(item.i));
          const currentHiddenLayout = current.visual.layouts[breakpoint].filter((item) => !visibleIds.has(item.i));
          const nextLayout = resizeDashboardGridItem({
            breakpoint,
            cardId,
            cards,
            h: nextH,
            layout: currentVisibleLayout,
            w: nextW
          });
          const nextLayouts = {
            ...current.visual.layouts,
            [breakpoint]: [...nextLayout, ...currentHiddenLayout]
          };

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
    [breakpoint, cards, measuredWidth, preferences.visual.layouts, updatePreferences, visibleIds]
  );

  return (
    <div ref={containerRef} className="dashboard-visual-grid-shell" onPointerDownCapture={handleResizeHandlePointerDown}>
      {gridReady ? (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={measuredWidth}
          breakpoints={dashboardBreakpointWidths}
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
            const layoutItem = preferences.visual.layouts[breakpoint].find((item) => item.i === card.id);
            const fallbackDimensions = normalizeDashboardCardDimensions(preferences.cards[card.id], card.defaultSize);
            const normalizedLayoutItem = layoutItem
              ? normalizeDashboardGridItem(layoutItem, breakpoint, card)
              : createDashboardGridItem(card, breakpoint, 0, 0, fallbackDimensions);
            const contentSize = getDashboardCardContentSizeForGridItem(normalizedLayoutItem);

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
