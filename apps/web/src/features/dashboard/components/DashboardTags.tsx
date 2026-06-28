import type { CreatorProfile, DashboardBoardColumn, Insight, InsightAction } from "@creator/data-contracts";
import { Badge, TagList, type BadgeTone, type TagListItem, cn } from "@creator/ui";

import { creatorTypeLabels, lifecycleLabels, severityTone, toneClass } from "../../../constants";
import type { MetricDefinition } from "../../../types";
import type { DashboardCardKind } from "../customization";

export const dashboardCardKindLabels: Record<DashboardCardKind, string> = {
  summary: "摘要",
  metric: "指标",
  trend: "趋势",
  insights: "洞察",
  "top-content": "内容",
  modules: "模块",
  "module-chart": "模块图表",
  actions: "行动"
};

const actionEffortTone: Record<InsightAction["effort"], BadgeTone> = {
  low: "green",
  medium: "amber",
  high: "red"
};

const boardColumnTones: Record<DashboardBoardColumn, BadgeTone> = {
  today: "blue",
  next: "amber",
  this_week: "neutral",
  done: "green"
};

const metricTrendTone: Record<MetricDefinition["trend"], BadgeTone> = {
  up: "green",
  down: "red",
  flat: "neutral"
};

const summaryStateLabel = {
  full: {
    positive: "可放大",
    notice: "可放大",
    warning: "需要关注",
    critical: "可放大",
    fallback: "可放大"
  },
  compact: {
    positive: "机会",
    notice: "机会",
    warning: "关注",
    critical: "机会",
    fallback: "机会"
  }
} as const;

export const CreatorSummaryTags = ({
  className,
  creator,
  severity,
  variant = "full"
}: {
  className?: string;
  creator: CreatorProfile;
  severity?: Insight["severity"];
  variant?: "full" | "compact";
}) => {
  const stateTone = severity ? severityTone[severity] : "neutral";
  const stateLabel = severity ? summaryStateLabel[variant][severity] : summaryStateLabel[variant].fallback;
  const items: TagListItem[] =
    variant === "compact"
      ? [
          {
            id: "creator-type",
            label: creatorTypeLabels[creator.creatorType],
            tone: "green"
          },
          {
            id: "summary-state",
            label: stateLabel,
            tone: stateTone
          }
        ]
      : [
          {
            id: "domain",
            label: creator.domain,
            tone: "blue"
          },
          {
            id: "creator-type",
            label: creatorTypeLabels[creator.creatorType],
            tone: "green"
          },
          {
            id: "lifecycle",
            label: lifecycleLabels[creator.lifecycle],
            tone: "neutral"
          },
          {
            id: "summary-state",
            label: stateLabel,
            tone: stateTone
          }
        ];

  return <TagList className={className} gap={variant === "compact" ? "tight" : "normal"} items={items} />;
};

export const ActionEffortTag = ({ effort }: { effort: InsightAction["effort"] }) => (
  <Badge tone={actionEffortTone[effort]}>{effort}</Badge>
);

export const BoardColumnCountTag = ({ column, count }: { column: DashboardBoardColumn; count: number }) => (
  <Badge tone={boardColumnTones[column]}>{count}</Badge>
);

export const DashboardCardKindTag = ({ kind }: { kind: DashboardCardKind }) => (
  <Badge tone="neutral">{dashboardCardKindLabels[kind]}</Badge>
);

export const InsightModuleTag = ({
  label,
  severity
}: {
  label: string;
  severity: Insight["severity"];
}) => <Badge tone={severityTone[severity]}>{label}</Badge>;

export const MetricToneTag = ({
  label,
  tone
}: {
  label: string;
  tone: MetricDefinition["tone"];
}) => <span className={cn("rounded-md px-2 py-1 text-xs font-medium", toneClass[tone].soft)}>{label}</span>;

export const MetricTrendTag = ({ metric }: { metric: Pick<MetricDefinition, "trend" | "trendLabel"> }) => (
  <Badge tone={metricTrendTone[metric.trend]}>{metric.trendLabel}</Badge>
);

export const ModuleTagList = ({
  className,
  limit,
  tags
}: {
  className?: string;
  limit?: number;
  tags: string[];
}) => (
  <TagList
    className={className}
    gap="tight"
    items={tags.map((tag) => ({
      id: tag,
      label: tag,
      tone: "neutral"
    }))}
    limit={limit}
  />
);
