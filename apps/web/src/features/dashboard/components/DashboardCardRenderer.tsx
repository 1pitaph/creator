import {
  useEffect,
  useState,
  type PointerEventHandler,
  type ReactNode,
} from "react";

import { ChartSlot } from "@creator/charts";
import type { DiagnosisResponse } from "@creator/data-contracts";
import { Button, cn } from "@creator/ui";
import { CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/CaretRight";
import { TrendUp } from "@phosphor-icons/react/TrendUp";

import { goalLabels, phosphorIconWeight } from "../../../constants";
import type { AskTarget, DashboardViewModel } from "../../../types";
import {
  chartHeightBySize,
  type DashboardActionCard,
  type DashboardCardDefinition,
} from "../customization";
import { DashboardModuleCard } from "./DashboardModuleCard";
import {
  ActionEffortTag,
  CreatorSummaryTags,
  MetricToneTag,
} from "./DashboardTags";
import { InsightRow } from "./InsightRow";
import { ModuleTile } from "./ModuleTile";
import { TopContentTile } from "./TopContentTile";
import { TrendMetricSummaryRail } from "./TrendMetricSummaryRail";

export const DashboardCardRenderer = ({
  actions,
  card,
  diagnosis,
  fill = false,
  onAsk,
  onDragHandlePointerDown,
  showDragHandle = false,
  size,
  viewModel,
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
}) => {
  const isCompactInsightsCard = fill && card.kind === "insights";

  return (
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
      contentClassName={cn(
        fill && "overflow-hidden",
        isCompactInsightsCard && "!py-3",
      )}
      size={size}
    >
      <CardBody
        actions={actions}
        card={card}
        diagnosis={diagnosis}
        fill={fill}
        onAsk={onAsk}
        size={size}
        viewModel={viewModel}
      />
    </DashboardModuleCard>
  );
};

const CardBody = ({
  actions,
  card,
  diagnosis,
  fill,
  onAsk,
  size,
  viewModel,
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
      return (
        <SummaryCardBody
          diagnosis={diagnosis}
          size={size}
          viewModel={viewModel}
        />
      );
    case "metric":
      return card.metric ? (
        <MetricCardBody
          fill={fill}
          metric={card.metric}
          metrics={viewModel.metrics}
          size={size}
        />
      ) : null;
    case "trend":
      return <TrendCardBody fill={fill} size={size} viewModel={viewModel} />;
    case "module-chart":
      return card.chartIntent ? (
        <ModuleChartCardBody
          chartIntent={card.chartIntent}
          fill={fill}
          size={size}
          viewModel={viewModel}
        />
      ) : null;
    case "insights":
      return (
        <PaginatedInsightsBody
          fill={fill}
          insights={diagnosis.insights}
          moduleById={viewModel.moduleById}
          onAsk={onAsk}
        />
      );
    case "top-content":
      return (
        <Scrollable fill={fill}>
          {diagnosis.metrics.topContents.map((content) => (
            <TopContentTile key={content.id} content={content} onAsk={onAsk} />
          ))}
        </Scrollable>
      );
    case "modules":
      return (
        <Scrollable fill={fill}>
          {diagnosis.modules.map((module) => (
            <ModuleTile key={module.id} module={module} onAsk={onAsk} />
          ))}
        </Scrollable>
      );
    case "actions":
      return (
        <Scrollable fill={fill}>
          {actions.map((action) => (
            <ActionPreviewCard key={action.id} action={action} />
          ))}
        </Scrollable>
      );
  }
};

const Scrollable = ({
  children,
  fill,
}: {
  children: ReactNode;
  fill: boolean;
}) => (
  <div className={cn("space-y-3", fill && "h-full overflow-auto pr-1")}>
    {children}
  </div>
);

const PaginatedInsightsBody = ({
  fill,
  insights,
  moduleById,
  onAsk,
}: {
  fill: boolean;
  insights: DiagnosisResponse["insights"];
  moduleById: DashboardViewModel["moduleById"];
  onAsk: (target: AskTarget) => void;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = insights.length;
  const maxPageIndex = Math.max(0, pageCount - 1);
  const visiblePageIndex = Math.min(pageIndex, maxPageIndex);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, maxPageIndex));
  }, [maxPageIndex]);

  const currentInsight = insights[visiblePageIndex] ?? insights[0];

  if (!currentInsight) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-zinc-500">
        暂无诊断结果。
      </p>
    );
  }

  const canGoPrevious = visiblePageIndex > 0;
  const canGoNext = visiblePageIndex < maxPageIndex;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        fill ? "h-full" : "min-h-[300px]",
      )}
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <InsightRow
          compact={fill}
          insight={currentInsight}
          module={moduleById.get(currentInsight.moduleId)}
          onAsk={onAsk}
        />
      </div>

      {pageCount > 1 ? (
        <nav
          className="mt-2 flex h-9 shrink-0 items-center justify-between border-t border-zinc-100/80 pt-2"
          aria-label="AI 诊断优先级分页"
          data-no-drag="true"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="!h-8 !w-8 rounded-full text-zinc-500"
            aria-label="上一条 AI 诊断优先级"
            disabled={!canGoPrevious}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            <CaretLeft className="h-4 w-4" weight={phosphorIconWeight} />
          </Button>

          <span
            className="text-[11px] font-medium leading-none text-zinc-500"
            role="status"
            aria-live="polite"
          >
            第 {visiblePageIndex + 1} / {pageCount} 条
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="!h-8 !w-8 rounded-full text-zinc-500"
            aria-label="下一条 AI 诊断优先级"
            disabled={!canGoNext}
            onClick={() =>
              setPageIndex((current) => Math.min(maxPageIndex, current + 1))
            }
          >
            <CaretRight className="h-4 w-4" weight={phosphorIconWeight} />
          </Button>
        </nav>
      ) : null}
    </div>
  );
};

const SummaryCardBody = ({
  diagnosis,
  size,
  viewModel,
}: {
  diagnosis: DiagnosisResponse;
  size: DashboardCardDefinition["defaultSize"];
  viewModel: DashboardViewModel;
}) => {
  const { healthScore, topInsight } = viewModel;

  if (size === "small") {
    return (
      <div className="flex h-full min-h-[116px] flex-col justify-between">
        <CreatorSummaryTags
          creator={diagnosis.creator}
          severity={topInsight?.severity}
          variant="compact"
        />
        <div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold leading-none text-zinc-950">
              {healthScore}
            </span>
            <span className="pb-1 text-xs font-medium text-zinc-500">/100</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
            {topInsight?.title ?? "保持稳定实验节奏"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-h-0 gap-5",
        size === "large"
          ? "h-full lg:grid-cols-[200px_minmax(0,1fr)]"
          : "grid-cols-1",
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.026),0_4px_14px_rgba(24,24,27,0.03)]",
          size === "large" && "flex h-full min-h-[180px] flex-col",
        )}
      >
        <p className="text-xs font-medium text-zinc-500">账号健康度</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-5xl font-semibold leading-none text-zinc-950">
            {healthScore}
          </span>
          <span className="pb-1.5 text-sm font-medium text-zinc-500">/100</span>
        </div>
        <div className="mt-5 h-2 rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400"
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          "min-w-0",
          size === "large" ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4",
        )}
      >
        <CreatorSummaryTags
          creator={diagnosis.creator}
          severity={topInsight?.severity}
        />
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {topInsight?.title ?? "保持稳定实验节奏"}
          </h2>
          <p
            className={cn(
              "mt-2 text-sm leading-7 text-zinc-600",
              size === "large" && "line-clamp-4",
            )}
          >
            {topInsight?.summary ??
              "当前没有明显异常，可以继续把高表现内容结构沉淀成系列化模板。"}
          </p>
        </div>
        <div
          className={cn(
            "grid gap-3 md:grid-cols-3",
            size === "large" && "mt-auto pt-1",
          )}
        >
          {diagnosis.creator.goals.slice(0, 3).map((goal) => (
            <div
              key={goal}
              className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]"
            >
              <p className="text-[11px] font-medium text-zinc-500">当前目标</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {goalLabels[goal]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCardBody = ({
  fill,
  metric,
  metrics,
  size,
}: {
  fill: boolean;
  metric: NonNullable<DashboardCardDefinition["metric"]>;
  metrics: DashboardViewModel["metrics"];
  size: DashboardCardDefinition["defaultSize"];
}) => {
  const shouldFillChart = fill && size !== "small";

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        shouldFillChart ? "min-h-0" : "min-h-[116px] justify-between",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <MetricToneTag label={metric.trendLabel} tone={metric.tone} />
        <TrendUp
          className={cn(
            "h-4 w-4",
            metric.trend === "down"
              ? "rotate-180 text-zinc-400"
              : metric.trend === "flat"
                ? "text-zinc-400"
                : "text-zinc-500",
          )}
          weight={phosphorIconWeight}
        />
      </div>
      <div
        className={cn(
          "mt-5",
          shouldFillChart && "flex min-h-0 flex-1 flex-col",
        )}
      >
        <p
          className={cn(
            "font-semibold tracking-normal text-zinc-950",
            size === "small" ? "text-4xl" : "text-5xl",
          )}
        >
          {metric.value}
        </p>
        <ChartSlot
          className={cn(
            size === "small" ? "mt-4" : "mt-5",
            shouldFillChart && "min-h-[118px] flex-1",
          )}
          height={
            shouldFillChart
              ? "100%"
              : size === "small"
                ? 56
                : chartHeightBySize[size]
          }
          intent={metric.chartIntent}
          metrics={metrics}
          tone={metric.tone}
          compact={size === "small"}
        />
      </div>
    </div>
  );
};

const TrendCardBody = ({
  fill,
  size,
  viewModel,
}: {
  fill: boolean;
  size: DashboardCardDefinition["defaultSize"];
  viewModel: DashboardViewModel;
}) => (
  <div className={cn("flex flex-col", fill && "h-full min-h-0")}>
    <ChartSlot
      className={cn(fill ? "min-h-0 flex-1" : "min-h-[220px]")}
      height={fill ? "100%" : chartHeightBySize[size]}
      intent={viewModel.trendComparisonChart}
      metrics={viewModel.metrics}
      tone="zinc"
      compact={size === "small"}
    />
    <TrendMetricSummaryRail
      className="mt-3 shrink-0"
      metrics={viewModel.metricCards}
    />
  </div>
);

const ModuleChartCardBody = ({
  chartIntent,
  fill,
  size,
  viewModel,
}: {
  chartIntent: NonNullable<DashboardCardDefinition["chartIntent"]>;
  fill: boolean;
  size: DashboardCardDefinition["defaultSize"];
  viewModel: DashboardViewModel;
}) => (
  <div className={cn(fill && "flex h-full min-h-0 flex-col")}>
    <ChartSlot
      className={cn(
        fill
          ? "min-h-0 flex-1"
          : "rounded-2xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]",
      )}
      height={fill ? "100%" : chartHeightBySize[size]}
      intent={chartIntent}
      metrics={viewModel.metrics}
      tone="zinc"
      compact={size === "small"}
    />
  </div>
);

const ActionPreviewCard = ({ action }: { action: DashboardActionCard }) => (
  <div className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-zinc-950">{action.label}</p>
      <ActionEffortTag effort={action.effort} />
    </div>
    <p className="mt-1 text-xs font-medium text-zinc-500">
      {action.insightTitle}
    </p>
    <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
  </div>
);
