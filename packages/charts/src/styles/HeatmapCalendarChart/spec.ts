import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries } from "../../adapters/metricSeries";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

export const getHeatmapCellColor = (value: number | undefined) => {
  const normalizedValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  if (normalizedValue >= 84) {
    return "#0369a1";
  }

  if (normalizedValue >= 66) {
    return "#0284c7";
  }

  if (normalizedValue >= 48) {
    return "#38bdf8";
  }

  if (normalizedValue >= 30) {
    return "#bae6fd";
  }

  return "#f0f9ff";
};

export const buildHeatmapCalendarSpec = (
  intent: ChartIntent,
  metrics: CreatorMetrics,
  compact = false,
): ISpec => {
  const values = buildChartSeries(intent, metrics).map((item) => ({
    ...item,
    lane: item.label,
  }));

  return {
    ...baseChartSpec,
    type: "heatmap",
    padding: compact
      ? { top: 4, right: 8, bottom: 24, left: 42 }
      : { top: 8, right: 12, bottom: 30, left: 58 },
    data: [{ id: "heatmap", values }],
    xField: "date",
    yField: "lane",
    valueField: "normalizedValue",
    cell: {
      style: {
        fill: (datum: { normalizedValue?: number }) =>
          getHeatmapCellColor(datum.normalizedValue),
        stroke: "#ffffff",
        lineWidth: 2,
        cornerRadius: 4,
      },
    },
    axes: [
      {
        orient: "bottom",
        type: "band",
        tick: { visible: false },
        domainLine: { visible: false },
        label: compact
          ? {
              space: 4,
              style: {
                fontSize: 11,
              },
            }
          : undefined,
      },
      {
        orient: "left",
        type: "band",
        tick: { visible: false },
        domainLine: { visible: false },
        label: {
          space: compact ? 4 : 8,
          style: {
            fontSize: compact ? 11 : 12,
            fill: "#52525b",
          },
        },
      },
    ],
    legends: {
      visible: false,
    },
    tooltip: defaultTooltip,
  } as ISpec;
};
