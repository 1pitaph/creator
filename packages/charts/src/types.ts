import type { ComponentType, ReactNode } from "react";

import type { ChartIntent, ChartStyle, CreatorMetrics } from "@creator/data-contracts";

export type ChartTone = "sky" | "emerald" | "amber" | "rose" | "violet" | "zinc";

export type ChartSlotProps = {
  intent: ChartIntent;
  metrics: CreatorMetrics;
  className?: string;
  height?: number | string;
  tone?: ChartTone;
  compact?: boolean;
  fallback?: ReactNode;
};

export type ChartStyleProps = ChartSlotProps & {
  ariaLabel: string;
};

export type ChartStyleModule = {
  default: ComponentType<ChartStyleProps>;
};

export type ChartStyleLoader = () => Promise<ChartStyleModule>;

export type ChartRegistry = Record<ChartStyle, ChartStyleLoader>;

export type ChartDatum = {
  date: string;
  key: string;
  label: string;
  value: number;
  normalizedValue: number;
  displayValue: string;
  unit: "count" | "percent" | "currency";
};
