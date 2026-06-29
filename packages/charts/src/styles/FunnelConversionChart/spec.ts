import type { CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildFunnelData } from "../../adapters/metricSeries";
import {
  chartEvidenceColors,
  chartTypography,
} from "../../theme/creatorChartTheme";
import { baseChartSpec } from "../shared/spec";

const buildStyledFunnelData = (metrics: CreatorMetrics) =>
  buildFunnelData(metrics).map((item, index) => {
    const stageColor =
      chartEvidenceColors.funnelStages[index] ??
      chartEvidenceColors.funnelStages[
        chartEvidenceColors.funnelStages.length - 1
      ] ??
      "#e4e7eb";

    return {
      ...item,
      stageColor,
      labelText: `${item.stage} ${item.displayValue}`,
    };
  });

export const buildFunnelConversionSpec = (
  metrics: CreatorMetrics,
  compact = false,
): ISpec =>
  ({
    ...baseChartSpec,
    type: "funnel",
    color: chartEvidenceColors.funnelStages,
    padding: compact
      ? { top: 4, right: 8, bottom: 4, left: 8 }
      : { top: 10, right: 28, bottom: 10, left: 28 },
    data: [{ id: "funnel", values: buildStyledFunnelData(metrics) }],
    categoryField: "stage",
    valueField: "value",
    funnelAlign: "center",
    maxSize: compact ? "88%" : "78%",
    minSize: compact ? "9%" : "12%",
    gap: compact ? 1 : 3,
    funnel: {
      style: {
        fill: (datum: { stageColor?: string }) =>
          datum.stageColor ?? chartEvidenceColors.funnelStages[0] ?? "#e4e7eb",
        stroke: "#ffffff",
        lineWidth: 1.5,
        fillOpacity: 0.96,
      },
    },
    label: {
      visible: !compact,
      style: {
        fill: chartEvidenceColors.labelInk,
        fontSize: chartTypography.funnelLabel.fontSize,
        fontWeight: chartTypography.funnelLabel.fontWeight,
        stroke: "transparent",
        lineWidth: 0,
        strokeOpacity: 0,
      },
      formatMethod: (
        _text: string,
        datum?: { labelText?: string; stage?: string; displayValue?: string },
      ) =>
        datum?.labelText ??
        [datum?.stage, datum?.displayValue].filter(Boolean).join(" "),
    },
    tooltip: {
      visible: true,
      mark: {
        content: [
          {
            key: (datum: { stage?: string }) => datum.stage ?? "",
            value: (datum: { displayValue?: string }) =>
              datum.displayValue ?? "",
          },
        ],
      },
    },
  }) as ISpec;
