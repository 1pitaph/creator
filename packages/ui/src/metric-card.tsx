import type { ReactNode } from "react";

import { Badge } from "./badge";
import { Card, CardContent } from "./card";

export const MetricCard = ({
  label,
  value,
  helper,
  trend,
  children
}: {
  label: string;
  value: string;
  helper?: string;
  trend?: "up" | "down" | "flat";
  children?: ReactNode;
}) => (
  <Card className="min-h-[126px]">
    <CardContent className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {trend ? (
          <Badge tone={trend === "up" ? "green" : trend === "down" ? "red" : "neutral"}>
            {trend === "up" ? "上升" : trend === "down" ? "下降" : "稳定"}
          </Badge>
        ) : null}
      </div>
      <div>
        <p className="mt-3 text-2xl font-semibold text-zinc-950">{value}</p>
        {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);
