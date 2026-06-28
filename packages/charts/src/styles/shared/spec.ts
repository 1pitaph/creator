import { creatorChartTheme } from "../../theme/creatorChartTheme";

export const baseChartSpec = {
  background: "transparent",
  autoFit: true,
  padding: 0,
  theme: creatorChartTheme
};

export const compactAxis = {
  visible: false,
  label: {
    visible: false
  },
  tick: {
    visible: false
  },
  domainLine: {
    visible: false
  },
  grid: {
    visible: false
  }
};

export const compactAxes = [
  {
    ...compactAxis,
    orient: "bottom",
    type: "band"
  },
  {
    ...compactAxis,
    orient: "left",
    type: "linear"
  }
];

export const defaultTooltip = {
  visible: true,
  mark: {
    title: {
      key: "date",
      value: (datum: { date?: string }) => datum.date ?? ""
    },
    content: [
      {
        key: (datum: { label?: string }) => datum.label ?? "",
        value: (datum: { displayValue?: string }) => datum.displayValue ?? ""
      }
    ]
  }
};
