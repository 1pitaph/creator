import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import {
  buildChartSeries,
  formatCompactAxisValue,
  metricMeta,
} from "../../adapters/metricSeries";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

const readAxisValue = (text: string | string[]) => {
  const rawValue = Array.isArray(text) ? text[0] : text;
  const value = Number(rawValue);

  return Number.isFinite(value) ? value : undefined;
};

export const buildDualAxisTrendSpec = (
  intent: ChartIntent,
  metrics: CreatorMetrics,
  compact = false,
): ISpec => {
  const keys = intent.metricKeys.slice(0, 2);
  const padding = compact
    ? { top: 2, right: 28, bottom: 24, left: 34 }
    : { top: 12, right: 48, bottom: 36, left: 52 };
  const buildAxisLabel = (key?: (typeof keys)[number]) =>
    compact
      ? {
          space: 4,
          formatMethod: (text: string | string[]) => {
            const value = readAxisValue(text);

            if (value === undefined) {
              return Array.isArray(text) ? text.join("") : text;
            }

            return key
              ? formatCompactAxisValue(value, metricMeta[key].unit)
              : `${Math.round(value)}`;
          },
          style: {
            fontSize: 11,
          },
        }
      : undefined;
  const data = keys.map((key) => ({
    id: key,
    values: buildChartSeries({ ...intent, metricKeys: [key] }, metrics),
  }));

  return {
    ...baseChartSpec,
    type: "common",
    padding,
    data,
    series: keys.map((key, index) => ({
      type: "line",
      dataIndex: index,
      xField: "date",
      yField: "value",
      seriesField: "label",
      point: {
        visible: true,
        style: {
          size: compact ? 4 : 5,
        },
      },
      line: {
        style: {
          lineWidth: compact ? 2.25 : 2.5,
          curveType: "monotone",
        },
      },
    })),
    axes: [
      {
        orient: "bottom",
        type: "band",
        seriesIndex: keys.map((_, index) => index),
        trimPadding: compact,
        bandPadding: compact ? 0 : undefined,
        paddingInner: compact ? 0 : undefined,
        paddingOuter: compact ? 0 : undefined,
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
        id: "left-axis",
        orient: "left",
        type: "linear",
        seriesIndex: [0],
        title: {
          visible: !compact,
          text: keys[0] ? metricMeta[keys[0]].label : "",
        },
        nice: true,
        zero: compact ? false : undefined,
        domainLine: { visible: false },
        label: buildAxisLabel(keys[0]),
      },
      {
        id: "right-axis",
        orient: "right",
        type: "linear",
        seriesIndex: [1],
        title: {
          visible: !compact,
          text: keys[1] ? metricMeta[keys[1]].label : "",
        },
        nice: true,
        zero: compact ? false : undefined,
        grid: { visible: false },
        domainLine: { visible: false },
        label: buildAxisLabel(keys[1]),
      },
    ],
    legends: {
      visible: true,
      orient: "bottom",
      position: "middle",
      padding: compact ? { top: 0 } : undefined,
      item: compact
        ? {
            height: 18,
            shape: {
              space: 4,
              style: {
                size: 8,
              },
            },
            label: {
              space: 4,
              style: {
                fontSize: 12,
              },
            },
          }
        : undefined,
      maxRow: compact ? 1 : undefined,
    },
    tooltip: defaultTooltip,
  } as ISpec;
};
