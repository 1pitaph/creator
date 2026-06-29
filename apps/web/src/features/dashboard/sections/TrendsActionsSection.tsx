import type { DiagnosisResponse } from "@creator/data-contracts";
import { ChartSlot } from "@creator/charts";

import { formatCompact } from "../../../lib/format";
import type { AskTarget, DashboardViewModel } from "../../../types";
import { ActionEffortTag } from "../components/DashboardTags";
import { DashboardModuleCard } from "../components/DashboardModuleCard";
import { TrendMetricSummaryRail } from "../components/TrendMetricSummaryRail";

export const TrendsActionsSection = ({
  diagnosis,
  viewModel,
  onAsk,
}: {
  diagnosis: DiagnosisResponse;
  viewModel: DashboardViewModel;
  onAsk: (target: AskTarget) => void;
}) => (
  <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <DashboardModuleCard
      title="7 日趋势对照"
      description="把播放、完播、互动和转粉放在同一块面板里观察波动。"
      askTarget={{
        title: "7 日趋势对照",
        prompt: `请结合 7 日趋势，找出「${diagnosis.creator.displayName}」波动最大的指标，并给一个排查顺序。`,
        summary: "播放、完播、互动、转粉趋势对照",
        evidence: diagnosis.metrics.history.map(
          (item) => `${item.date} 播放 ${formatCompact(item.views)}`,
        ),
      }}
      onAsk={onAsk}
    >
      <ChartSlot
        className="min-h-[220px]"
        height={260}
        intent={viewModel.trendComparisonChart}
        metrics={viewModel.metrics}
        tone="zinc"
        compact={false}
      />
      <TrendMetricSummaryRail
        className="mt-3"
        metrics={viewModel.metricCards}
      />
    </DashboardModuleCard>

    <DashboardModuleCard
      title="下一步行动队列"
      description="把诊断动作压缩成今天能执行的运营清单。"
      askTarget={{
        title: "下一步行动队列",
        prompt:
          "请把当前所有诊断动作整理成「今天、明天、本周」三个时间段的行动清单。",
        summary: "根据所有 insight actions 汇总",
        evidence: diagnosis.insights.flatMap((insight) =>
          insight.actions.map((action) => action.label),
        ),
      }}
      onAsk={onAsk}
    >
      <div className="space-y-3">
        {viewModel.actionQueue.map((action) => (
          <div
            key={`${action.insightTitle}-${action.label}`}
            className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-950">
                {action.label}
              </p>
              <ActionEffortTag effort={action.effort} />
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              {action.detail}
            </p>
          </div>
        ))}
      </div>
    </DashboardModuleCard>
  </section>
);
