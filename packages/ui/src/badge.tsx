import type { HTMLAttributes } from "react";

import { cn } from "./utils/cn";

export type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue";

export const Badge = ({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) => (
  <span
    className={cn(
      "inline-flex min-h-6 items-center rounded border px-2 py-0 text-xs font-medium leading-none",
      tone === "neutral" && "border-zinc-200 bg-white text-zinc-600",
      tone === "green" && "border-emerald-200/80 bg-emerald-50/50 text-emerald-700",
      tone === "amber" && "border-amber-200/80 bg-amber-50/50 text-amber-700",
      tone === "red" && "border-rose-200/80 bg-rose-50/50 text-rose-700",
      tone === "blue" && "border-slate-200 bg-slate-50/70 text-slate-700",
      className
    )}
    {...props}
  />
);
