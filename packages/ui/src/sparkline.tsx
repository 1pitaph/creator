import { memo, useMemo } from "react";

import { cn } from "./utils/cn";

export const Sparkline = memo(function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const points = useMemo(() => {
    if (values.length === 0) {
      return "";
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 36 - ((value - min) / range) * 32;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg className={cn("h-10 w-full overflow-visible", className)} viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
});
