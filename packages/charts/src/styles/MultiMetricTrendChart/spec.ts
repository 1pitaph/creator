import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries } from "../../adapters/metricSeries";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

export const buildMultiMetricTrendSpec = (intent: ChartIntent, metrics: CreatorMetrics): ISpec => {
  const values = buildChartSeries(intent, metrics);
  const yField = intent.unit === "mixed" ? "normalizedValue" : "value";

  return {
    ...baseChartSpec,
    type: "line",
    padding: { top: 8, right: 12, bottom: 36, left: 44 },
    data: [{ id: "trend", values }],
    xField: "date",
    yField,
    seriesField: "label",
    point: {
      visible: true,
      style: {
        size: 5
      }
    },
    line: {
      style: {
        lineWidth: 2.5,
        curveType: "monotone"
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
        type: "linear",
        nice: true,
        domainLine: { visible: false }
      }
    ],
    legends: {
      visible: true,
      orient: "bottom",
      position: "middle"
    },
    crosshair: {
      xField: { visible: true }
    },
    tooltip: defaultTooltip
  } as ISpec;
};
