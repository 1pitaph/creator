import type { ChartRegistry } from "./types";

export const chartRegistry: ChartRegistry = {
  "mini-trend": () => import("./styles/MiniTrendChart"),
  "multi-metric-trend": () => import("./styles/MultiMetricTrendChart"),
  "dual-axis-trend": () => import("./styles/DualAxisTrendChart"),
  "funnel-conversion": () => import("./styles/FunnelConversionChart"),
  "radar-score": () => import("./styles/RadarScoreChart"),
  "heatmap-calendar": () => import("./styles/HeatmapCalendarChart")
};
