import { cn } from "@creator/ui";

import type { MetricDefinition } from "../../../types";
import { MetricTrendTag } from "./DashboardTags";

export const TrendMetricSummaryRail = ({
  className,
  metrics,
}: {
  className?: string;
  metrics: MetricDefinition[];
}) => {
  const visibleMetrics = metrics.slice(0, 4);

  if (!visibleMetrics.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-5 gap-y-3 border-t border-zinc-100/80 pt-3 sm:grid-cols-4",
        className,
      )}
    >
      {visibleMetrics.map((metric) => (
        <div key={metric.id} className="min-w-0">
          <p className="truncate text-[11px] font-medium text-zinc-500">
            {metric.label}
          </p>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-lg font-semibold leading-none text-zinc-950">
              {metric.value}
            </p>
            <MetricTrendTag metric={metric} />
          </div>
        </div>
      ))}
    </div>
  );
};
