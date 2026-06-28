import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { ResponsiveGridLayout, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";

import type { DashboardBreakpoint, DashboardCardSize, DashboardPreferencesV1, DiagnosisResponse } from "@creator/data-contracts";

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
      [...(layouts[breakpoint] ?? [])].map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
        maxW: item.maxW,
        maxH: item.maxH
      }))
    ])
  ) as DashboardPreferencesV1["visual"]["layouts"];

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

  return (
    <div ref={containerRef}>
      {mounted ? (
        <ResponsiveGridLayout<DashboardBreakpoint>
          width={width}
          breakpoints={breakpoints}
          cols={dashboardColumnCounts}
          layouts={layouts}
          rowHeight={36}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          autoSize
          dragConfig={{
            enabled: editing,
            bounded: true,
            cancel: "button, input, select, textarea, [data-no-drag]",
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
