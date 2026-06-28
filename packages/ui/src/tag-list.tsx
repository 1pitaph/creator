import type { HTMLAttributes, ReactNode } from "react";

import { Badge, type BadgeTone } from "./badge";
import { cn } from "./utils/cn";

export type TagListItem = {
  id: string;
  label: ReactNode;
  tone?: BadgeTone;
  title?: string;
  className?: string;
};

type TagListGap = "tight" | "normal";

const tagListGapClass: Record<TagListGap, string> = {
  tight: "gap-1",
  normal: "gap-1.5"
};

export const TagList = ({
  className,
  gap = "normal",
  items,
  limit,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  gap?: TagListGap;
  items: TagListItem[];
  limit?: number;
}) => {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap", tagListGapClass[gap], className)} {...props}>
      {visibleItems.map((item) => (
        <Badge key={item.id} tone={item.tone} title={item.title} className={item.className}>
          {item.label}
        </Badge>
      ))}
    </div>
  );
};
