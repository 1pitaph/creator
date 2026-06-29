import type { CreatorMetrics } from "@creator/data-contracts";
import type { ISpec } from "@visactor/react-vchart";

import { buildFunnelData } from "../../adapters/metricSeries";
import { baseChartSpec } from "../shared/spec";

export const buildFunnelConversionSpec = (
  metrics: CreatorMetrics,
  compact = false,
): ISpec =>
  ({
    ...baseChartSpec,
    type: "funnel",
    padding: compact
      ? { top: 4, right: 8, bottom: 4, left: 8 }
      : { top: 8, right: 16, bottom: 8, left: 16 },
    data: [{ id: "funnel", values: buildFunnelData(metrics) }],
    categoryField: "stage",
    valueField: "value",
    label: {
      visible: !compact,
      style: {
        fill: "#18181b",
        fontSize: 12,
      },
      formatMethod: (text: string, datum: { displayValue?: string }) =>
        `${text} ${datum.displayValue ?? ""}`,
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
