import { lazy, memo, Suspense } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { ChartStyle } from "@creator/data-contracts";

import { buildChartSeries } from "./adapters/metricSeries";
import { chartRegistry } from "./registry";
import type { ChartSlotProps, ChartStyleProps } from "./types";

const lazyCharts: Record<ChartStyle, LazyExoticComponent<ComponentType<ChartStyleProps>>> = {
  "mini-trend": lazy(chartRegistry["mini-trend"]),
  "multi-metric-trend": lazy(chartRegistry["multi-metric-trend"]),
  "dual-axis-trend": lazy(chartRegistry["dual-axis-trend"]),
  "funnel-conversion": lazy(chartRegistry["funnel-conversion"]),
  "radar-score": lazy(chartRegistry["radar-score"]),
  "heatmap-calendar": lazy(chartRegistry["heatmap-calendar"])
};

const isInteractiveChartRuntime = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return !navigator.userAgent.toLowerCase().includes("jsdom");
};

const DefaultChartFallback = memo(function DefaultChartFallback({ intent, metrics, className, height = 160 }: ChartSlotProps) {
  const values = buildChartSeries(intent, metrics).slice(-10);
  const max = Math.max(...values.map((item) => item.normalizedValue), 1);

  return (
    <div
      className={className}
      role="img"
      aria-label={`${intent.title} 图表占位`}
      style={{ height, display: "flex", alignItems: "end", gap: 4, paddingTop: 8 }}
    >
      {values.map((item, index) => (
        <span
          key={`${item.key}-${item.date}-${index}`}
          title={`${item.label} ${item.displayValue}`}
          style={{
            flex: 1,
            minWidth: 3,
            height: `${Math.max(8, (item.normalizedValue / max) * 100)}%`,
            borderRadius: 4,
            background: "#d4d4d8"
          }}
        />
      ))}
    </div>
  );
});

export const ChartSlot = memo(function ChartSlot(props: ChartSlotProps) {
  const { intent, metrics, fallback } = props;
  const ChartComponent = lazyCharts[intent.style];
  const ariaLabel = `${intent.title}${intent.description ? `，${intent.description}` : ""}`;

  if (!isInteractiveChartRuntime()) {
    return fallback ?? <DefaultChartFallback {...props} />;
  }

  return (
    <Suspense fallback={fallback ?? <DefaultChartFallback {...props} />}>
      <ChartComponent {...props} intent={intent} metrics={metrics} ariaLabel={ariaLabel} />
    </Suspense>
  );
});
