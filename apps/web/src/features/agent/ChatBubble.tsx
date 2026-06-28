import { memo } from "react";

import type {
  AgentRun,
  AiModuleMetadata,
} from "@creator/data-contracts";
import { cn } from "@creator/ui";

import type { UiMessage } from "../../types";
import { ActionTimeframeTag, AgentRunModeTag, MessageContextTags, ToolCallTagList } from "./AgentTags";

export const ChatBubble = memo(function ChatBubble({
  message,
  moduleById,
}: {
  message: UiMessage;
  moduleById: Map<string, AiModuleMetadata>;
}) {
  const isAssistant = message.role === "assistant";
  const usedModuleNames = message.usedModules
    ?.map((moduleId) => moduleById.get(moduleId)?.name ?? moduleId)
    .filter(Boolean);

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6",
          isAssistant ? "bg-zinc-100 text-zinc-800" : "bg-zinc-950 text-white",
        )}
      >
        {message.notice ? (
          <p
            className={cn(
              "mb-2 rounded-lg border px-3 py-2 text-xs font-medium",
              noticeToneClass[message.notice.tone],
            )}
          >
            {message.notice.label}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isAssistant && message.agentRun ? (
          <AgentRunPanel run={message.agentRun} />
        ) : null}
        {isAssistant && usedModuleNames && usedModuleNames.length > 0 ? (
          <MessageContextTags mode={message.mode} moduleNames={usedModuleNames} />
        ) : null}
      </div>
    </div>
  );
});

const confidenceLabel: Record<AgentRun["facts"][number]["confidence"], string> =
  {
    high: "高置信",
    medium: "中置信",
    low: "低置信",
  };

const noticeToneClass: Record<
  NonNullable<UiMessage["notice"]>["tone"],
  string
> = {
  error: "border-red-100 bg-red-50 text-red-800",
  info: "border-sky-100 bg-sky-50 text-sky-800",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
};

const AgentRunPanel = ({ run }: { run: AgentRun }) => (
  <div className="mt-4 space-y-3 border-t border-zinc-200/80 pt-3 text-xs leading-5">
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-zinc-700">数据事实</p>
        <AgentRunModeTag mode={run.mode} />
      </div>
      <div className="space-y-1.5">
        {run.facts.slice(0, 3).map((fact) => (
          <div
            key={fact.id}
            className="rounded-lg border border-zinc-200 bg-white/70 px-3 py-2"
          >
            <p className="text-zinc-700">{fact.statement}</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {confidenceLabel[fact.confidence]}
            </p>
          </div>
        ))}
      </div>
    </div>

    {run.assumptions.length > 0 ? (
      <div>
        <p className="mb-2 font-semibold text-zinc-700">AI 推测</p>
        <div className="space-y-1.5">
          {run.assumptions.slice(0, 2).map((assumption) => (
            <div
              key={assumption.id}
              className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-amber-900"
            >
              <p>{assumption.statement}</p>
              {assumption.risk ? (
                <p className="mt-1 text-[11px] text-amber-700">
                  {assumption.risk}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ) : null}

    {run.actions.length > 0 ? (
      <div>
        <p className="mb-2 font-semibold text-zinc-700">行动建议</p>
        <div className="space-y-1.5">
          {run.actions.slice(0, 3).map((action) => (
            <div
              key={action.id}
              className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-semibold text-sky-950">{action.label}</p>
                <ActionTimeframeTag timeframe={action.timeframe} />
              </div>
              <p className="mt-1 text-sky-900">{action.detail}</p>
              {action.metricToWatch ? (
                <p className="mt-1 text-[11px] text-sky-700">
                  观察指标：{action.metricToWatch}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ) : null}

    <div>
      <p className="mb-2 font-semibold text-zinc-700">工具调用</p>
      <ToolCallTagList toolCalls={run.toolCalls} />
    </div>
  </div>
);
