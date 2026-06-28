import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries } from "../../adapters/metricSeries";
import { chartToneColors } from "../../theme/creatorChartTheme";
import type { ChartTone } from "../../types";
import { baseChartSpec, compactAxis, defaultTooltip } from "../shared/spec";

export const buildMiniTrendSpec = (intent: ChartIntent, metrics: CreatorMetrics, tone: ChartTone = "zinc"): ISpec => {
  const values = buildChartSeries(intent, metrics);
  const yField = intent.unit === "mixed" ? "normalizedValue" : "value";

  return {
    ...baseChartSpec,
    type: "line",
    data: [{ id: "trend", values }],
    xField: "date",
    yField,
    seriesField: "label",
    point: {
      visible: false
    },
    line: {
      style: {
        stroke: chartToneColors[tone],
        lineWidth: 2.5,
        curveType: "monotone"
      }
    },
    axes: [compactAxis, compactAxis],
    legends: {
      visible: false
    },
    tooltip: defaultTooltip
  } as ISpec;
};
