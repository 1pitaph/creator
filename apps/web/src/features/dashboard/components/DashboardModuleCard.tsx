import type { ReactNode } from "react";

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
  children
}: {
  title: string;
  description?: string;
  askTarget: AskTarget;
  onAsk: (target: AskTarget) => void;
  className?: string;
  contentClassName?: string;
  fill?: boolean;
  children: ReactNode;
}) => (
  <GlowingPanel className={className}>
    <Card className={cn("relative z-10 overflow-visible rounded-[19px] border-0 bg-white shadow-none", fill && "flex h-full flex-col")}>
      <AskAgentToolbar target={askTarget} onAsk={onAsk} />
      <CardHeader className="relative z-10 border-b border-zinc-100/80 !py-5 !pl-6 !pr-28">
        <CardTitle className="text-[15px] font-semibold text-zinc-900">{title}</CardTitle>
        {description ? <p className="mt-1.5 text-[13px] leading-5 text-zinc-500">{description}</p> : null}
      </CardHeader>
      <CardContent className={cn("relative z-10 !px-6 !py-5", fill && "min-h-0 flex-1", contentClassName)}>{children}</CardContent>
    </Card>
  </GlowingPanel>
);

const AskAgentToolbar = ({ target, onAsk }: { target: AskTarget; onAsk: (target: AskTarget) => void }) => (
  <div
    className="absolute right-3 top-3 z-20 flex translate-y-1 opacity-0 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
    data-testid="ask-agent-toolbar"
  >
    <HoverBorderGradientButton ariaLabel={`询问 AI Agent：${target.title}`} onClick={() => onAsk(target)} />
  </div>
);
