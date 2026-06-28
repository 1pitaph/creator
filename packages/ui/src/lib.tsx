import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export const cn = (...values: Array<string | false | null | undefined>) => clsx(values);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "icon";
};

export const Button = ({ className, variant = "secondary", size = "md", ...props }: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      variant === "primary" && "border-transparent bg-zinc-950 text-white hover:bg-zinc-800 focus-visible:outline-zinc-950",
      variant === "secondary" && "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-zinc-400",
      variant === "ghost" && "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-400",
      size === "sm" && "h-8 px-3",
      size === "md" && "h-10 px-4",
      size === "icon" && "h-9 w-9",
      className
    )}
    {...props}
  />
);

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <section className={cn("rounded-lg border border-zinc-200 bg-white shadow-sm", className)} {...props} />
);

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-b border-zinc-100 p-4", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-sm font-semibold text-zinc-950", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...props} />
);

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
        {trend && (
          <Badge tone={trend === "up" ? "green" : trend === "down" ? "red" : "neutral"}>
            {trend === "up" ? "上升" : trend === "down" ? "下降" : "稳定"}
          </Badge>
        )}
      </div>
      <div>
        <p className="mt-3 text-2xl font-semibold text-zinc-950">{value}</p>
        {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
      </div>
      {children}
    </CardContent>
  </Card>
);

export const Sparkline = ({ values, className }: { values: number[]; className?: string }) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 36 - ((value - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className={cn("h-10 w-full overflow-visible", className)} viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
};
