import type { HTMLAttributes } from "react";

import { cn } from "./utils/cn";

export const Badge = ({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "green" | "amber" | "red" | "blue" }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
      tone === "neutral" && "bg-zinc-100 text-zinc-700",
      tone === "green" && "bg-emerald-50 text-emerald-700",
      tone === "amber" && "bg-amber-50 text-amber-700",
      tone === "red" && "bg-rose-50 text-rose-700",
      tone === "blue" && "bg-sky-50 text-sky-700",
      className
    )}
    {...props}
  />
);
