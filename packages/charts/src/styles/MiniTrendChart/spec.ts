import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries } from "../../adapters/metricSeries";
import { chartToneColors } from "../../theme/creatorChartTheme";
import type { ChartTone } from "../../types";
import { baseChartSpec, compactAxes, defaultTooltip } from "../shared/spec";

const compactMiniTrendAxes = [
  {
    ...compactAxes[0],
    trimPadding: true,
    bandPadding: 0,
    paddingInner: 0,
    paddingOuter: 0,
  },
  compactAxes[1],
];

export const buildMiniTrendSpec = (
  intent: ChartIntent,
  metrics: CreatorMetrics,
  tone: ChartTone = "zinc",
  compact = true,
): ISpec => {
  const values = buildChartSeries(intent, metrics);
  const yField =
    compact || intent.unit === "mixed" ? "normalizedValue" : "value";

  return {
    ...baseChartSpec,
    type: "line",
    padding: compact ? 0 : { top: 2, right: 2, bottom: 2, left: 2 },
    animation: false,
    data: [{ id: "trend", values }],
    xField: "date",
    yField,
    seriesField: "label",
    area: {
      visible: true,
      style: {
        fill: chartToneColors[tone],
        fillOpacity: 0.08,
      },
    },
    point: {
      visible: !compact,
      style: {
        fill: "#ffffff",
        lineWidth: 2,
        size: 4,
      },
    },
    line: {
      style: {
        stroke: chartToneColors[tone],
        lineWidth: 2.5,
        curveType: "monotone",
      },
    },
    axes: compact ? compactMiniTrendAxes : compactAxes,
    legends: {
      visible: false,
    },
    tooltip: defaultTooltip,
  } as ISpec;
};
