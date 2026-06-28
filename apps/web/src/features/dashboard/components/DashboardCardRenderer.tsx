import type { PointerEventHandler, ReactNode } from "react";

import { ChartSlot } from "@creator/charts";
import type { DiagnosisResponse } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";
import { TrendUp } from "@phosphor-icons/react/TrendUp";

import { creatorTypeLabels, goalLabels, lifecycleLabels, phosphorIconWeight, severityTone, toneClass } from "../../../constants";
import type { AskTarget, DashboardViewModel } from "../../../types";
import { chartHeightBySize, type DashboardActionCard, type DashboardCardDefinition } from "../customization";
import { DashboardModuleCard } from "./DashboardModuleCard";
import { InsightRow } from "./InsightRow";
import { ModuleTile } from "./ModuleTile";
import { TopContentTile } from "./TopContentTile";
import { TrendStrip } from "./TrendStrip";

export const DashboardCardRenderer = ({
  actions,
  card,
  diagnosis,
  fill = false,
  onAsk,
  onDragHandlePointerDown,
  showDragHandle = false,
  size,
  viewModel
}: {
  actions: DashboardActionCard[];
  card: DashboardCardDefinition;
  diagnosis: DiagnosisResponse;
  fill?: boolean;
  onAsk: (target: AskTarget) => void;
  onDragHandlePointerDown?: PointerEventHandler<HTMLButtonElement>;
  showDragHandle?: boolean;
  size: DashboardCardDefinition["defaultSize"];
  viewModel: DashboardViewModel;
}) => (
  <DashboardModuleCard
    title={card.title}
    description={card.description}
    askTarget={card.askTarget}
    onAsk={onAsk}
    fill={fill}
    showDragHandle={showDragHandle}
    dragHandleLabel={`拖动卡片：${card.title}`}
    onDragHandlePointerDown={onDragHandlePointerDown}
    className={fill ? "h-full" : undefined}
    contentClassName={fill ? "overflow-hidden" : undefined}
  >
    <CardBody actions={actions} card={card} diagnosis={diagnosis} fill={fill} onAsk={onAsk} size={size} viewModel={viewModel} />
  </DashboardModuleCard>
);

const CardBody = ({
  actions,
  card,
  diagnosis,
  fill,
  onAsk,
  size,
  viewModel
}: {
  actions: DashboardActionCard[];
  card: DashboardCardDefinition;
  diagnosis: DiagnosisResponse;
  fill: boolean;
  onAsk: (target: AskTarget) => void;
  size: DashboardCardDefinition["defaultSize"];
  viewModel: DashboardViewModel;
}) => {
  switch (card.kind) {
    case "summary":
      return <SummaryCardBody diagnosis={diagnosis} viewModel={viewModel} />;
    case "metric":
      return card.metric ? <MetricCardBody metric={card.metric} metrics={viewModel.metrics} /> : null;
    case "trend":
      return <TrendCardBody fill={fill} size={size} viewModel={viewModel} />;
    case "insights":
      return <Scrollable fill={fill}>{diagnosis.insights.map((insight) => <InsightRow key={insight.id} insight={insight} module={viewModel.moduleById.get(insight.moduleId)} onAsk={onAsk} />)}</Scrollable>;
    case "top-content":
      return <Scrollable fill={fill}>{diagnosis.metrics.topContents.map((content) => <TopContentTile key={content.id} content={content} onAsk={onAsk} />)}</Scrollable>;
    case "modules":
      return <Scrollable fill={fill}>{diagnosis.modules.map((module) => <ModuleTile key={module.id} module={module} metrics={viewModel.metrics} onAsk={onAsk} />)}</Scrollable>;
    case "actions":
      return <Scrollable fill={fill}>{actions.map((action) => <ActionPreviewCard key={action.id} action={action} />)}</Scrollable>;
  }
};

const Scrollable = ({ children, fill }: { children: ReactNode; fill: boolean }) => (
  <div className={cn("space-y-3", fill && "h-full overflow-auto pr-1")}>{children}</div>
);

const SummaryCardBody = ({ diagnosis, viewModel }: { diagnosis: DiagnosisResponse; viewModel: DashboardViewModel }) => {
  const { healthScore, topInsight } = viewModel;

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.026),0_4px_14px_rgba(24,24,27,0.03)]">
        <p className="text-xs font-medium text-zinc-500">账号健康度</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-5xl font-semibold leading-none text-zinc-950">{healthScore}</span>
          <span className="pb-1.5 text-sm font-medium text-zinc-500">/100</span>
        </div>
        <div className="mt-5 h-2 rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400" style={{ width: `${healthScore}%` }} />
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{diagnosis.creator.domain}</Badge>
          <Badge tone="green">{creatorTypeLabels[diagnosis.creator.creatorType]}</Badge>
          <Badge tone="neutral">{lifecycleLabels[diagnosis.creator.lifecycle]}</Badge>
          <Badge tone={topInsight?.severity ? severityTone[topInsight.severity] : "neutral"}>{topInsight?.severity === "warning" ? "需要关注" : "可放大"}</Badge>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">{topInsight?.title ?? "保持稳定实验节奏"}</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">{topInsight?.summary ?? "当前没有明显异常，可以继续把高表现内容结构沉淀成系列化模板。"}</p>
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
  );
};

const MetricCardBody = ({ metric, metrics }: { metric: NonNullable<DashboardCardDefinition["metric"]>; metrics: DashboardViewModel["metrics"] }) => (
  <div className="flex h-full min-h-[116px] flex-col justify-between">
    <div className="flex items-center justify-between gap-3">
      <span className={cn("rounded-md px-2 py-1 text-xs font-medium", toneClass[metric.tone].soft)}>{metric.trendLabel}</span>
      <TrendUp className={cn("h-4 w-4", metric.trend === "down" ? "rotate-180 text-zinc-400" : metric.trend === "flat" ? "text-zinc-400" : "text-zinc-500")} weight={phosphorIconWeight} />
    </div>
    <div className="mt-5">
      <p className="text-4xl font-semibold tracking-normal text-zinc-950">{metric.value}</p>
      <ChartSlot className="mt-5" height={56} intent={metric.chartIntent} metrics={metrics} tone={metric.tone} compact />
    </div>
  </div>
);

const TrendCardBody = ({ fill, size, viewModel }: { fill: boolean; size: DashboardCardDefinition["defaultSize"]; viewModel: DashboardViewModel }) => (
  <div className={cn(fill && "flex h-full min-h-0 flex-col")}>
    <ChartSlot
      className="rounded-2xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]"
      height={fill ? "min(100%, 360px)" : chartHeightBySize[size]}
      intent={viewModel.trendComparisonChart}
      metrics={viewModel.metrics}
      tone="zinc"
    />
    {size === "hero" || size === "wide" ? (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {viewModel.metricCards.slice(0, 4).map((metric) => (
          <TrendStrip key={metric.id} metric={metric} metrics={viewModel.metrics} />
        ))}
      </div>
    ) : null}
  </div>
);

const ActionPreviewCard = ({ action }: { action: DashboardActionCard }) => (
  <div className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-zinc-950">{action.label}</p>
      <Badge tone={action.effort === "low" ? "green" : action.effort === "medium" ? "amber" : "red"}>{action.effort}</Badge>
    </div>
    <p className="mt-1 text-xs font-medium text-zinc-500">{action.insightTitle}</p>
    <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
  </div>
);
