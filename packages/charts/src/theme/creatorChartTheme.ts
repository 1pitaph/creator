import type { ChartTone } from "../types";

export const chartToneColors: Record<ChartTone, string> = {
  sky: "#0284c7",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  violet: "#7c3aed",
  zinc: "#18181b",
};

export const chartPalette = [
  "#18181b",
  "#0284c7",
  "#059669",
  "#d97706",
  "#e11d48",
  "#7c3aed",
];

export const chartEvidenceColors = {
  axisText: "#71717a",
  labelInk: "#3f3f46",
  neutralBar: "#cfd6df",
  neutralBarStroke: "#aeb7c3",
  rateLine: "#0ea5e9",
  rateLineSoft: "#7dd3fc",
  funnelStages: ["#e4e7eb", "#bfdbfe", "#ccfbf1", "#fde68a"],
};

export const chartTypography = {
  axis: {
    fontSize: 11,
  },
  legend: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
  },
  funnelLabel: {
    fontSize: 12,
    fontWeight: 650,
  },
} as const;

export const creatorChartTheme = {
  colorScheme: {
    default: {
      dataScheme: chartPalette,
    },
  },
  component: {
    axis: {
      label: {
        style: {
          fill: "#71717a",
          fontSize: chartTypography.axis.fontSize,
        },
      },
      grid: {
        style: {
          stroke: "#e4e4e7",
          lineDash: [4, 4],
        },
      },
    },
    tooltip: {
      style: {
        panel: {
          backgroundColor: "#ffffff",
          borderColor: "#e4e4e7",
          shadowBlur: 18,
          shadowColor: "rgba(24,24,27,0.12)",
        },
        titleLabel: {
          fill: "#18181b",
        },
        keyLabel: {
          fill: "#52525b",
        },
        valueLabel: {
          fill: "#18181b",
        },
      },
    },
  },
};
