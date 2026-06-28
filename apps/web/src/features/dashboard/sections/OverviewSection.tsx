import type { DiagnosisResponse } from "@creator/data-contracts";
import { Badge } from "@creator/ui";

import { goalLabels, lifecycleLabels, severityTone } from "../../../constants";
import type { AskTarget, DashboardViewModel } from "../../../types";
import { DashboardModuleCard } from "../components/DashboardModuleCard";
import { ModuleTile } from "../components/ModuleTile";

export const OverviewSection = ({
  diagnosis,
  viewModel,
  onAsk
}: {
  diagnosis: DiagnosisResponse;
  viewModel: DashboardViewModel;
  onAsk: (target: AskTarget) => void;
}) => {
  const { healthScore, topInsight } = viewModel;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <DashboardModuleCard
        title="AI 诊断摘要"
        description="基于创作者画像、近 7 日数据和动态模块生成的优先级判断。"
        askTarget={{
          title: "AI 诊断摘要",
          prompt: `请总结「${diagnosis.creator.displayName}」当前最重要的增长问题，并按优先级给 3 个动作。`,
          summary: topInsight?.summary,
          evidence: topInsight?.evidence
        }}
        onAsk={onAsk}
        className="min-h-[260px]"
      >
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.026),0_4px_14px_rgba(24,24,27,0.03)]">
            <p className="text-xs font-medium text-zinc-500">账号健康度</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-6xl font-semibold leading-none text-zinc-950">{healthScore}</span>
              <span className="pb-2 text-sm font-medium text-zinc-500">/100</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400" style={{ width: `${healthScore}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">综合播放、完播、互动、转粉和模块风险后得到。</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{diagnosis.creator.domain}</Badge>
              <Badge tone="neutral">{lifecycleLabels[diagnosis.creator.lifecycle]}</Badge>
              <Badge tone={topInsight?.severity ? severityTone[topInsight.severity] : "neutral"}>
                {topInsight?.severity === "warning" ? "需要关注" : "可放大"}
              </Badge>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">{topInsight?.title ?? "保持稳定实验节奏"}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
                {topInsight?.summary ?? "当前没有明显异常，可以继续把高表现内容结构沉淀成系列化模板。"}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {diagnosis.creator.goals.slice(0, 3).map((goal) => (
                <div key={goal} className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]">
                  <p className="text-[11px] font-medium text-zinc-500">当前目标</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{goalLabels[goal]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardModuleCard>

      <DashboardModuleCard
        title="已加载 AI 模块"
        description="模块根据创作者阶段、目标、内容形态和数据阈值动态加载。"
        askTarget={{
          title: "已加载 AI 模块",
          prompt: `请解释为什么「${diagnosis.creator.displayName}」当前加载了这些 AI 分析模块，并说明每个模块负责什么。`,
          summary: `共加载 ${diagnosis.modules.length} 个模块`,
          evidence: diagnosis.modules.map((module) => module.name)
        }}
        onAsk={onAsk}
      >
        <div className="space-y-3">
          {diagnosis.modules.map((module) => (
            <ModuleTile key={module.id} module={module} onAsk={onAsk} />
          ))}
        </div>
      </DashboardModuleCard>
    </section>
  );
};
