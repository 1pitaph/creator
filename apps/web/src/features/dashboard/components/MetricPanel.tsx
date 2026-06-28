import { TrendUp } from "@phosphor-icons/react/TrendUp";

import { ChartSlot } from "@creator/charts";
import type { CreatorMetrics } from "@creator/data-contracts";
import { cn } from "@creator/ui";

import { phosphorIconWeight, toneClass } from "../../../constants";
import type { AskTarget, MetricDefinition } from "../../../types";
import { DashboardModuleCard } from "./DashboardModuleCard";

export const MetricPanel = ({
  metric,
  metrics,
  onAsk
}: {
  metric: MetricDefinition;
  metrics: CreatorMetrics;
  onAsk: (target: AskTarget) => void;
}) => (
  <DashboardModuleCard
    title={metric.label}
    description={metric.helper}
    askTarget={metric.askTarget}
    onAsk={onAsk}
    className="min-h-[214px]"
  >
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-md px-2 py-1 text-xs font-medium", toneClass[metric.tone].soft)}>{metric.trendLabel}</span>
        <TrendUp
          className={cn(
            "h-4 w-4",
            metric.trend === "down" ? "rotate-180 text-zinc-400" : metric.trend === "flat" ? "text-zinc-400" : "text-zinc-500"
          )}
          weight={phosphorIconWeight}
        />
      </div>
      <div className="mt-5">
        <p className="text-4xl font-semibold tracking-normal text-zinc-950">{metric.value}</p>
        <ChartSlot className="mt-5" height={56} intent={metric.chartIntent} metrics={metrics} tone={metric.tone} compact />
      </div>
    </div>
  </DashboardModuleCard>
);
