import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import {
  buildChartSeries,
  formatCompactAxisValue,
  metricMeta,
} from "../../adapters/metricSeries";
import { chartTypography } from "../../theme/creatorChartTheme";
import { baseChartSpec, defaultTooltip } from "../shared/spec";

const readAxisValue = (text: string | string[]) => {
  const rawValue = Array.isArray(text) ? text[0] : text;
  const value = Number(rawValue);

  return Number.isFinite(value) ? value : undefined;
};

export const buildMultiMetricTrendSpec = (
  intent: ChartIntent,
  metrics: CreatorMetrics,
  compact = false,
): ISpec => {
  const values = buildChartSeries(intent, metrics);
  const yField = intent.unit === "mixed" ? "normalizedValue" : "value";
  const axisUnit =
    intent.unit === "mixed"
      ? undefined
      : intent.metricKeys[0]
        ? metricMeta[intent.metricKeys[0]].unit
        : undefined;
  const axisLabel = compact
    ? {
        space: 4,
        formatMethod: (text: string | string[]) => {
          const value = readAxisValue(text);

          if (value === undefined) {
            return Array.isArray(text) ? text.join("") : text;
          }

          return axisUnit
            ? formatCompactAxisValue(value, axisUnit)
            : `${Math.round(value)}`;
        },
        style: {
          fontSize: chartTypography.axis.fontSize,
        },
      }
    : undefined;

  return {
    ...baseChartSpec,
    type: "line",
    padding: compact
      ? { top: 2, right: 4, bottom: 24, left: 32 }
      : { top: 8, right: 12, bottom: 36, left: 44 },
    data: [{ id: "trend", values }],
    xField: "date",
    yField,
    seriesField: "label",
    point: {
      visible: true,
      style: {
        size: 5,
      },
    },
    line: {
      style: {
        lineWidth: 2.5,
        curveType: "monotone",
      },
    },
    axes: [
      {
        orient: "bottom",
        type: "band",
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
                fontSize: chartTypography.axis.fontSize,
              },
            }
          : undefined,
      },
      {
        orient: "left",
        type: "linear",
        nice: true,
        domainLine: { visible: false },
        label: axisLabel,
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
                fontSize: chartTypography.legend.fontSize,
              },
            },
          }
        : undefined,
      maxRow: compact ? 1 : undefined,
    },
    crosshair: {
      xField: { visible: true },
    },
    tooltip: defaultTooltip,
  } as ISpec;
};
