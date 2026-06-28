import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildChartSeries, metricMeta } from "../../adapters/metricSeries";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

export const buildDualAxisTrendSpec = (intent: ChartIntent, metrics: CreatorMetrics): ISpec => {
  const keys = intent.metricKeys.slice(0, 2);
  const data = keys.map((key) => ({
    id: key,
    values: buildChartSeries({ ...intent, metricKeys: [key] }, metrics)
  }));

  return {
    ...baseChartSpec,
    type: "common",
    padding: { top: 12, right: 48, bottom: 36, left: 52 },
    data,
    series: keys.map((key, index) => ({
      type: "line",
      dataIndex: index,
      xField: "date",
      yField: "value",
      seriesField: "label",
      axisId: index === 1 ? "right-axis" : "left-axis",
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
      }
    })),
    axes: [
      {
        orient: "bottom",
        type: "band",
        tick: { visible: false },
        domainLine: { visible: false }
      },
      {
        id: "left-axis",
        orient: "left",
        type: "linear",
        title: { visible: true, text: keys[0] ? metricMeta[keys[0]].label : "" },
        nice: true,
        domainLine: { visible: false }
      },
      {
        id: "right-axis",
        orient: "right",
        type: "linear",
        title: { visible: true, text: keys[1] ? metricMeta[keys[1]].label : "" },
        nice: true,
        grid: { visible: false },
        domainLine: { visible: false }
      }
    ],
    legends: {
      visible: true,
      orient: "bottom",
      position: "middle"
    },
    tooltip: defaultTooltip
  } as ISpec;
};
