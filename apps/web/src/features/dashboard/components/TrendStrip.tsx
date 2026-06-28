import { Badge, Sparkline, cn } from "@creator/ui";

import type { MetricDefinition } from "../../../types";

export const TrendStrip = ({ metric }: { metric: MetricDefinition }) => (
  <div className="rounded-2xl bg-white p-4 shadow-[0_1px_1px_rgba(24,24,27,0.024),0_3px_10px_rgba(24,24,27,0.026)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-zinc-500">{metric.label}</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-950">{metric.value}</p>
      </div>
      <Badge tone={metric.trend === "down" ? "red" : metric.trend === "up" ? "green" : "neutral"}>{metric.trendLabel}</Badge>
    </div>
    <Sparkline className={cn("mt-5 h-16", metric.trend === "down" ? "text-zinc-500" : "text-zinc-900")} values={metric.values} />
  </div>
);
