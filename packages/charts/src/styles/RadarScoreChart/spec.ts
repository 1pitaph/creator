import type { CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildRadarData } from "../../adapters/metricSeries";
import { baseChartSpec } from "../shared/spec";

export const buildRadarScoreSpec = (metrics: CreatorMetrics): ISpec => ({
  ...baseChartSpec,
  type: "radar",
  padding: { top: 16, right: 24, bottom: 16, left: 24 },
  data: [{ id: "radar", values: buildRadarData(metrics) }],
  categoryField: "label",
  valueField: "score",
  seriesField: "series",
  point: {
    visible: true
  },
  area: {
    visible: true,
    style: {
      fillOpacity: 0.14
    }
  },
  axes: [
    {
      orient: "angle",
      domainLine: { visible: false },
      grid: { visible: true }
    },
    {
      orient: "radius",
      min: 0,
      max: 100,
      tick: { visible: false },
      label: { visible: false }
    }
  ],
  legends: {
    visible: false
  },
  tooltip: {
    visible: true,
    mark: {
      content: [
        {
          key: (datum: { label?: string }) => datum.label ?? "",
          value: (datum: { score?: number }) => `${Math.round(datum.score ?? 0)} 分`
        }
      ]
    }
  }
} as ISpec);
