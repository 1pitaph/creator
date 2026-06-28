import { CheckCircle } from "@phosphor-icons/react/CheckCircle";

import type { AiModuleMetadata, Insight } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";

import { MiniAskButton } from "../../../components/effects/AskAgentButton";
import { phosphorIconWeight, severityTone } from "../../../constants";
import type { AskTarget } from "../../../types";

export const InsightRow = ({
  insight,
  module,
  onAsk
}: {
  insight: Insight;
  module?: AiModuleMetadata;
  onAsk: (target: AskTarget) => void;
}) => (
  <article className="group/row relative rounded-xl bg-white p-4 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
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
    <div className="flex items-start justify-between gap-4 pr-10">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={severityTone[insight.severity]}>{module?.name ?? insight.moduleId}</Badge>
          {insight.metricLabel ? <span className="text-xs text-zinc-500">{`${insight.metricLabel} ${insight.metricValue ?? ""}`}</span> : null}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-950">{insight.title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{insight.summary}</p>
      </div>
      <CheckCircle className={cn("h-5 w-5 shrink-0", insight.severity === "warning" ? "text-amber-500" : "text-emerald-500")} weight={phosphorIconWeight} />
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {insight.actions.map((action) => (
        <div key={action.label} className="rounded-lg bg-zinc-50/70 p-3 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.75)]">
          <p className="text-xs font-semibold text-zinc-900">{action.label}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
        </div>
      ))}
    </div>
  </article>
);
