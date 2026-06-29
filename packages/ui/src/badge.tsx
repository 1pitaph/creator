import type { HTMLAttributes } from "react";

import { cn } from "./utils/cn";

export type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue";
export type BadgeSize = "sm" | "micro";

const badgeSizeClass: Record<BadgeSize, string> = {
  sm: "type-badge",
  micro: "type-meta-2xs-tight"
};

export const Badge = ({
  className,
  size = "sm",
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { size?: BadgeSize; tone?: BadgeTone }) => (
  <span
    className={cn(
      "inline-flex min-h-6 items-center rounded-full border px-2 py-0",
      badgeSizeClass[size],
      tone === "neutral" && "border-zinc-200 bg-white text-zinc-600",
      tone === "green" &&
        "border-dashed border-emerald-300/80 bg-emerald-50/60 bg-[repeating-linear-gradient(135deg,rgba(16,185,129,0.12)_0,rgba(16,185,129,0.12)_1px,transparent_1px,transparent_5px)] text-zinc-600",
      tone === "amber" &&
        "border-dashed border-amber-300/80 bg-amber-50/60 bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.14)_0,rgba(245,158,11,0.14)_1px,transparent_1px,transparent_5px)] text-zinc-600",
      tone === "red" &&
        "border-dashed border-rose-300/80 bg-rose-50/60 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.12)_0,rgba(244,63,94,0.12)_1px,transparent_1px,transparent_5px)] text-zinc-600",
      tone === "blue" &&
        "border-dashed border-slate-300/80 bg-slate-50/60 bg-[repeating-linear-gradient(135deg,rgba(100,116,139,0.12)_0,rgba(100,116,139,0.12)_1px,transparent_1px,transparent_5px)] text-zinc-600",
      className
    )}
    {...props}
  />
);
