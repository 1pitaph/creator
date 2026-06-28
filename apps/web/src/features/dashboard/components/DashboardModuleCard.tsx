import type { PointerEventHandler, ReactNode } from "react";

import { DotsSixVertical } from "@phosphor-icons/react/DotsSixVertical";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@creator/ui";

import { phosphorIconWeight } from "../../../constants";
import { HoverBorderGradientButton } from "../../../components/effects/AskAgentButton";
import { GlowingPanel } from "../../../components/effects/GlowingPanel";
import type { AskTarget } from "../../../types";

export const DashboardModuleCard = ({
  title,
  description,
  askTarget,
  onAsk,
  className,
  contentClassName,
  fill = false,
  dragHandleLabel,
  onDragHandlePointerDown,
  showDragHandle = false,
  children
}: {
  title: string;
  description?: string;
  askTarget: AskTarget;
  onAsk: (target: AskTarget) => void;
  className?: string;
  contentClassName?: string;
  fill?: boolean;
  dragHandleLabel?: string;
  onDragHandlePointerDown?: PointerEventHandler<HTMLButtonElement>;
  showDragHandle?: boolean;
  children: ReactNode;
}) => (
  <GlowingPanel className={className}>
    <Card className={cn("relative z-10 overflow-visible rounded-[19px] border-0 bg-white shadow-none", fill && "flex h-full flex-col")}>
      {showDragHandle ? <DashboardCardDragHandle label={dragHandleLabel ?? `拖动卡片：${title}`} onPointerDown={onDragHandlePointerDown} /> : null}
      <AskAgentToolbar target={askTarget} onAsk={onAsk} />
      <CardHeader className={cn("relative z-10 border-b border-zinc-100/80 !py-5 !pr-28", showDragHandle ? "!pl-14" : "!pl-6")}>
        <CardTitle className="text-[15px] font-semibold text-zinc-900">{title}</CardTitle>
        {description ? <p className="mt-1.5 text-[13px] leading-5 text-zinc-500">{description}</p> : null}
      </CardHeader>
      <CardContent className={cn("relative z-10 !px-6 !py-5", fill && "min-h-0 flex-1", contentClassName)}>{children}</CardContent>
    </Card>
  </GlowingPanel>
);

const DashboardCardDragHandle = ({
  label,
  onPointerDown
}: {
  label: string;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
}) => (
  <button
    type="button"
    className="dashboard-card-drag-handle absolute left-3 top-5 z-20 inline-flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-md text-zinc-400 opacity-0 transition duration-150 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 active:cursor-grabbing active:text-zinc-700 group-hover:opacity-100 group-focus-within:opacity-100"
    aria-label={label}
    data-dashboard-card-drag-handle="true"
    onPointerDown={onPointerDown}
  >
    <DotsSixVertical className="pointer-events-none h-5 w-5" weight={phosphorIconWeight} />
  </button>
);

const AskAgentToolbar = ({ target, onAsk }: { target: AskTarget; onAsk: (target: AskTarget) => void }) => (
  <div
    className="absolute right-3 top-3 z-20 flex translate-y-1 opacity-0 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
    data-testid="ask-agent-toolbar"
  >
    <HoverBorderGradientButton ariaLabel={`询问 AI Agent：${target.title}`} onClick={() => onAsk(target)} />
  </div>
);
