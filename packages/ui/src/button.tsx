import type { ButtonHTMLAttributes } from "react";

import { cn } from "./utils/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "icon";
};

export const Button = ({ className, variant = "secondary", size = "md", ...props }: ButtonProps) => (
  <button
    className={cn(
      "type-control-sm inline-flex items-center justify-center gap-2 rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
