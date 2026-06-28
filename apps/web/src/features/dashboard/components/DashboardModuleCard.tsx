import type { PointerEventHandler, ReactNode } from "react";

import { DotsSixVertical } from "@phosphor-icons/react/DotsSixVertical";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@creator/ui";

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
    {showDragHandle ? <DashboardCardDragHandle label={dragHandleLabel ?? `拖动卡片：${title}`} onPointerDown={onDragHandlePointerDown} /> : null}
    <Card className={cn("relative z-10 overflow-visible !rounded-[inherit] border-0 bg-white shadow-none", fill && "flex h-full flex-col")}>
      <AskAgentToolbar target={askTarget} onAsk={onAsk} />
      <CardHeader className="relative z-10 border-b border-zinc-100/80 !py-5 !pl-6 !pr-28">
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
    className="dashboard-card-drag-handle absolute left-0 top-3 z-30 inline-flex h-[34px] w-[34px] -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-md bg-zinc-100/100 text-zinc-500 opacity-0 shadow-[0_4px_12px_rgba(24,24,27,0.12)] transition duration-150 hover:bg-zinc-200/100 hover:text-zinc-700 hover:shadow-[0_7px_18px_rgba(24,24,27,0.16)] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 active:cursor-grabbing active:text-zinc-700 group-hover:opacity-100 group-focus-within:opacity-100"
    aria-label={label}
    data-dashboard-card-drag-handle="true"
    onPointerDown={onPointerDown}
  >
    <DotsSixVertical className="pointer-events-none h-6 w-6" weight="bold" />
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
