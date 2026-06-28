import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries } from "../../adapters/metricSeries";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

export const buildHeatmapCalendarSpec = (intent: ChartIntent, metrics: CreatorMetrics): ISpec => {
  const values = buildChartSeries(intent, metrics).map((item) => ({
    ...item,
    lane: item.label
  }));

  return {
    ...baseChartSpec,
    type: "heatmap",
    padding: { top: 8, right: 12, bottom: 28, left: 40 },
    data: [{ id: "heatmap", values }],
    xField: "date",
    yField: "lane",
    valueField: "normalizedValue",
    cell: {
      style: {
        stroke: "#ffffff",
        lineWidth: 2,
        cornerRadius: 4
      }
    },
    axes: [
      {
        orient: "bottom",
        type: "band",
        tick: { visible: false },
        domainLine: { visible: false }
      },
      {
        orient: "left",
        type: "band",
        tick: { visible: false },
        domainLine: { visible: false }
      }
    ],
    legends: {
      visible: false
    },
    tooltip: defaultTooltip
  } as ISpec;
};
