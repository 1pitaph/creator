import { CheckCircle } from "@phosphor-icons/react/CheckCircle";

import type { AiModuleMetadata, Insight } from "@creator/data-contracts";
import { cn } from "@creator/ui";

import { MiniAskButton } from "../../../components/effects/AskAgentButton";
import { phosphorIconWeight } from "../../../constants";
import type { AskTarget } from "../../../types";
import { InsightModuleTag } from "./DashboardTags";

export const InsightRow = ({
  insight,
  module,
  onAsk,
  compact = false
}: {
  insight: Insight;
  module?: AiModuleMetadata;
  onAsk: (target: AskTarget) => void;
  compact?: boolean;
}) => (
  <article
    className={cn(
      "group/row relative transition",
      compact
        ? "flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-zinc-50/70 p-3 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.9)] hover:shadow-[inset_0_0_0_1px_rgba(228,228,231,0.95)]"
        : "rounded-xl bg-white p-4 shadow-[0_1px_1px_rgba(24,24,27,0.024)] hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]"
    )}
  >
    <MiniAskButton
      label={insight.title}
      onClick={() =>
        onAsk({
          title: insight.title,
          moduleId: insight.moduleId,
          prompt: `请深入解释「${insight.title}」这个诊断，说明证据、优先级和今天应该怎么执行。`,
          summary: insight.summary,
          evidence: insight.evidence
        })
      }
    />
    <div className={cn("flex min-w-0 items-start justify-between", compact ? "gap-3 pr-8" : "gap-4 pr-10")}>
      <div className="min-w-0">
        <div className={cn(compact ? "flex min-w-0 items-center gap-2 overflow-hidden" : "flex flex-wrap items-center gap-2")}>
          <InsightModuleTag className={compact ? "min-h-5 px-1.5 text-[11px]" : undefined} label={module?.name ?? insight.moduleId} severity={insight.severity} />
          {insight.metricLabel ? <span className={cn("text-xs text-zinc-500", compact && "truncate text-[11px] leading-none")}>{`${insight.metricLabel} ${insight.metricValue ?? ""}`}</span> : null}
        </div>
        <h3 className={cn("font-semibold text-zinc-950", compact ? "mt-2 line-clamp-2 break-words text-[13px] leading-5" : "mt-3 text-sm")}>{insight.title}</h3>
        <p className={cn("text-zinc-600", compact ? "mt-1 line-clamp-2 break-words text-xs leading-5" : "mt-1 text-sm leading-6")}>{insight.summary}</p>
      </div>
      <CheckCircle className={cn("shrink-0", compact ? "h-4 w-4" : "h-5 w-5", insight.severity === "warning" ? "text-amber-500" : "text-emerald-500")} weight={phosphorIconWeight} />
    </div>
    <div className={cn("grid", compact ? "mt-3 gap-2 sm:grid-cols-2" : "mt-4 gap-3 md:grid-cols-2")}>
      {insight.actions.map((action) => (
        <div
          key={action.label}
          className={cn(compact ? "rounded-md bg-white/75 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.72)]" : "rounded-lg bg-zinc-50/70 p-3 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.75)]")}
        >
          <p className={cn("font-semibold text-zinc-900", compact ? "line-clamp-1 break-words text-[11px] leading-4" : "text-xs")}>{action.label}</p>
          <p className={cn("text-zinc-600", compact ? "mt-0.5 line-clamp-2 break-words text-[11px] leading-4" : "mt-1 text-xs leading-5")}>{action.detail}</p>
        </div>
      ))}
    </div>
  </article>
);
