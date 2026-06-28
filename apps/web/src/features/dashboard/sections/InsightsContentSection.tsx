import type { DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../../types";
import { DashboardModuleCard } from "../components/DashboardModuleCard";
import { InsightRow } from "../components/InsightRow";
import { TopContentTile } from "../components/TopContentTile";

export const InsightsContentSection = ({
  diagnosis,
  viewModel,
  onAsk
}: {
  diagnosis: DiagnosisResponse;
  viewModel: DashboardViewModel;
  onAsk: (target: AskTarget) => void;
}) => (
  <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
    <DashboardModuleCard
      title="AI 诊断优先级"
      description="系统根据画像与近 7 日数据选择最该处理的问题。"
      askTarget={{
        title: "AI 诊断优先级",
        prompt: `请基于诊断优先级，告诉我「${diagnosis.creator.displayName}」今天应该先做哪一件事，为什么？`,
        summary: viewModel.topInsight?.summary,
        evidence: viewModel.topInsight?.evidence
      }}
      onAsk={onAsk}
    >
      <div className="space-y-3">
        {diagnosis.insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} module={viewModel.moduleById.get(insight.moduleId)} onAsk={onAsk} />
        ))}
      </div>
    </DashboardModuleCard>

    <DashboardModuleCard
      title="高表现内容样本"
      description="Agent 会优先参考这些样本生成下一条内容结构。"
      askTarget={{
        title: "高表现内容样本",
        prompt: `请基于高表现内容样本，为「${diagnosis.creator.displayName}」提炼可复用的标题、开头和结尾模板。`,
        summary: viewModel.topContent?.title,
        evidence: diagnosis.metrics.topContents.map((item) => item.opportunity)
      }}
      onAsk={onAsk}
    >
      <div className="space-y-3">
        {diagnosis.metrics.topContents.map((content) => (
          <TopContentTile key={content.id} content={content} onAsk={onAsk} />
        ))}
      </div>
    </DashboardModuleCard>
  </section>
);
