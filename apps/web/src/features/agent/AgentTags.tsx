import type { AgentAction, AgentRun, AgentToolCall } from "@creator/data-contracts";
import { Badge, TagList, type BadgeTone, type TagListItem } from "@creator/ui";

import type { UiMessage } from "../../types";

const messageModeTone: Record<NonNullable<UiMessage["mode"]>, BadgeTone> = {
  llm: "neutral",
  local: "neutral",
  mock: "neutral"
};

const agentRunModeLabel: Record<AgentRun["mode"], string> = {
  "llm-assisted": "LLM 辅助",
  deterministic: "确定性工具"
};

const toolStatusTone: Record<AgentToolCall["status"], BadgeTone> = {
  pending: "neutral",
  running: "blue",
  success: "green",
  error: "red",
  skipped: "neutral"
};

const toolStatusLabel: Record<AgentToolCall["status"], string> = {
  pending: "等待",
  running: "运行中",
  success: "完成",
  error: "失败",
  skipped: "跳过"
};

const actionTimeframeLabel: Record<AgentAction["timeframe"], string> = {
  today: "今天",
  tomorrow: "明天",
  this_week: "本周",
  next_review: "下次复盘"
};

export const EvidenceTagList = ({
  className,
  evidence,
  limit = 3
}: {
  className?: string;
  evidence: string[];
  limit?: number;
}) => (
  <TagList
    className={className}
    gap="tight"
    items={evidence.map((item) => ({
      id: item,
      label: item,
      className:
        item.length > 18
          ? "type-badge-wrap max-w-full items-start rounded-lg py-1.5 text-left whitespace-normal break-words"
          : "whitespace-nowrap",
      tone: "neutral"
    }))}
    limit={limit}
  />
);

export const MessageContextTags = ({
  mode,
  moduleNames
}: {
  mode?: UiMessage["mode"];
  moduleNames: string[];
}) => {
  const items: TagListItem[] = [
    ...(mode
      ? [
          {
            id: "message-mode",
            label: mode,
            tone: messageModeTone[mode]
          }
        ]
      : []),
    ...moduleNames.slice(0, 3).map((name) => ({
      id: `module-${name}`,
      label: name,
      tone: "neutral" as const
    }))
  ];

  return <TagList className="mt-3" gap="tight" items={items} />;
};

export const AgentRunModeTag = ({ mode }: { mode: AgentRun["mode"] }) => (
  <Badge tone="neutral">{agentRunModeLabel[mode]}</Badge>
);

export const ActionTimeframeTag = ({ timeframe }: { timeframe: AgentAction["timeframe"] }) => (
  <Badge tone="neutral">{actionTimeframeLabel[timeframe]}</Badge>
);

export const ToolCallTagList = ({ toolCalls }: { toolCalls: AgentToolCall[] }) => (
  <TagList
    gap="tight"
    items={toolCalls.map((tool) => ({
      id: tool.id,
      label: `${tool.name} · ${toolStatusLabel[tool.status]}`,
      tone: toolStatusTone[tool.status],
      title: tool.error ?? tool.outputSummary
    }))}
  />
);
