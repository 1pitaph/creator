import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretUp } from "@phosphor-icons/react/CaretUp";
import { ChatText } from "@phosphor-icons/react/ChatText";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { StopCircle } from "@phosphor-icons/react/StopCircle";
import { X } from "@phosphor-icons/react/X";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AgentApprovalRequest,
  AiModuleMetadata,
} from "@creator/data-contracts";
import { Button, CardHeader, CardTitle, cn } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";
import type { AskTarget, UiMessage } from "../../types";
import { AgentMarkIcon } from "./AgentMarkIcon";
import { EvidenceTagList } from "./AgentTags";
import { ChatBubble } from "./ChatBubble";
import { presetQuestions } from "./presetQuestions";

export const AgentDrawer = ({
  open,
  onClose,
  messages,
  isChatting,
  onSendMessage,
  onAskPreset,
  onStopGeneration,
  approval,
  onApproveApproval,
  onDenyApproval,
  isResumingApproval,
  moduleById,
  focus,
}: AgentDrawerProps) => {
  const [isContextCollapsed, setIsContextCollapsed] = useState(true);
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );
  const convertMessage = useCallback(
    (message: UiMessage, index: number): ThreadMessageLike => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.content }],
      ...(message.role === "assistant"
        ? {
            status:
              isChatting && index === messages.length - 1
                ? { type: "running" as const }
                : { type: "complete" as const, reason: "stop" as const },
          }
        : {}),
      metadata: {
        custom: {
          localOnly: Boolean(message.localOnly),
          mode: message.mode,
          uiMessageId: message.id,
        },
      },
    }),
    [isChatting, messages.length],
  );
  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      const text = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("")
        .trim();

      if (!text) {
        return;
      }

      await onSendMessage(text);
    },
    [onSendMessage],
  );
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage,
    isRunning: isChatting,
    isSendDisabled: isChatting,
    onCancel: async () => onStopGeneration(),
    onNew: handleNewMessage,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  useEffect(() => {
    setIsContextCollapsed(true);
  }, [focus?.moduleId, focus?.title]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className="agent-drawer-content fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[430px] flex-col border-l border-zinc-200 bg-white shadow-2xl outline-none"
          data-testid="agent-drawer-content"
        >
          <AssistantRuntimeProvider runtime={runtime}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-900 bg-zinc-950 text-white shadow-[0_14px_32px_rgba(24,24,27,0.22)]">
                  <span className="pointer-events-none absolute inset-1 rounded-full border border-white/10" />
                  <AgentMarkIcon
                    className="relative z-10 h-5 w-5"
                    data-testid="agent-drawer-icon"
                  />
                  <span
                    className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <CardTitle>AI 聊天 Agent</CardTitle>
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-xs text-zinc-500">
                    按当前模块上下文回答。
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                  aria-label="关闭 AI Agent"
                >
                  <X className="h-4 w-4" weight={phosphorIconWeight} />
                </button>
              </Dialog.Close>
            </CardHeader>

            {focus ? (
              <AgentContextPanel
                focus={focus}
                isChatting={isChatting}
                isCollapsed={isContextCollapsed}
                onAskPreset={onAskPreset}
                onToggleCollapsed={() =>
                  setIsContextCollapsed((collapsed) => !collapsed)
                }
              />
            ) : (
              <PresetQuestionSection
                isChatting={isChatting}
                onAskPreset={onAskPreset}
              />
            )}

            <ThreadPrimitive.Root className="min-h-0 flex-1">
              <ThreadPrimitive.Viewport
                className="h-full overflow-y-auto p-4"
                autoScroll
              >
                <div className="space-y-4">
                  <ThreadPrimitive.Messages>
                    {({ message }) => {
                      const uiMessage = messagesById.get(message.id);

                      return (
                        <MessagePrimitive.Root>
                          {uiMessage ? (
                            <ChatBubble
                              message={uiMessage}
                              moduleById={moduleById}
                            />
                          ) : (
                            <FallbackAssistantMessage role={message.role} />
                          )}
                        </MessagePrimitive.Root>
                      );
                    }}
                  </ThreadPrimitive.Messages>
                  {isChatting ? (
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <CircleNotch
                          className="h-3.5 w-3.5 animate-spin"
                          weight={phosphorIconWeight}
                        />
                        Agent 正在调用分析模块
                      </div>
                      <ComposerPrimitive.Cancel
                        className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="停止生成"
                      >
                        <StopCircle
                          className="h-3.5 w-3.5"
                          weight={phosphorIconWeight}
                        />
                        停止
                      </ComposerPrimitive.Cancel>
                    </div>
                  ) : null}
                </div>
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>

            {approval ? (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-950">
                      {approval.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      {approval.detail}
                    </p>
                    {approval.risk ? (
                      <p className="mt-1 text-[11px] leading-5 text-amber-700">
                        {approval.risk}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isResumingApproval}
                      onClick={onDenyApproval}
                    >
                      拒绝
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={isResumingApproval}
                      onClick={onApproveApproval}
                    >
                      确认
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <ComposerPrimitive.Root className="border-t border-zinc-100 p-4">
              <div className="flex items-end gap-2">
                <ComposerPrimitive.Input
                  className="min-h-[74px] flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="围绕当前模块继续追问..."
                  submitMode="enter"
                  rows={3}
                />
                <ComposerPrimitive.Send
                  className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-transparent bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="发送消息"
                >
                  <PaperPlaneTilt
                    className="h-4 w-4"
                    weight={phosphorIconWeight}
                  />
                </ComposerPrimitive.Send>
              </div>
            </ComposerPrimitive.Root>
          </AssistantRuntimeProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const AgentContextPanel = ({
  focus,
  isChatting,
  isCollapsed,
  onAskPreset,
  onToggleCollapsed,
}: {
  focus: AskTarget;
  isChatting: boolean;
  isCollapsed: boolean;
  onAskPreset: (question: string) => void;
  onToggleCollapsed: () => void;
}) => {
  const toggleLabel = isCollapsed ? "展开当前询问模块" : "收起当前询问模块";
  const ToggleIcon = isCollapsed ? CaretDown : CaretUp;

  return (
    <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
          <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-500">当前询问模块</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">
            {focus.title}
          </p>
          {!isCollapsed && focus.summary ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              {focus.summary}
            </p>
          ) : null}
          {!isCollapsed && focus.evidence && focus.evidence.length > 0 ? (
            <EvidenceTagList className="mt-2" evidence={focus.evidence} />
          ) : null}
        </div>
      </div>

      {!isCollapsed ? (
        <PresetQuestionList
          className="mt-3 border-t border-zinc-200/70 pt-3"
          isChatting={isChatting}
          onAskPreset={onAskPreset}
        />
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          aria-expanded={!isCollapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleCollapsed}
        >
          <span>{isCollapsed ? "展开" : "收起"}</span>
          <ToggleIcon className="h-3.5 w-3.5" weight={phosphorIconWeight} />
        </button>
      </div>
    </div>
  );
};

const PresetQuestionSection = ({
  isChatting,
  onAskPreset,
}: {
  isChatting: boolean;
  onAskPreset: (question: string) => void;
}) => (
  <div className="border-b border-zinc-100 px-4 py-3">
    <PresetQuestionList isChatting={isChatting} onAskPreset={onAskPreset} />
  </div>
);

const PresetQuestionList = ({
  className,
  isChatting,
  onAskPreset,
}: {
  className?: string;
  isChatting: boolean;
  onAskPreset: (question: string) => void;
}) => (
  <div className={cn("flex flex-wrap gap-2", className)}>
    {presetQuestions.map((question) => (
      <Button
        key={question}
        type="button"
        size="sm"
        variant="ghost"
        disabled={isChatting}
        onClick={() => onAskPreset(question)}
      >
        <ChatText className="h-3.5 w-3.5" weight={phosphorIconWeight} />
        {question}
      </Button>
    ))}
  </div>
);

type AgentDrawerProps = {
  open: boolean;
  onClose: () => void;
  messages: UiMessage[];
  isChatting: boolean;
  onSendMessage: (question: string) => Promise<void> | void;
  onAskPreset: (question: string) => void;
  onStopGeneration: () => void;
  approval?: AgentApprovalRequest;
  onApproveApproval: () => void;
  onDenyApproval: () => void;
  isResumingApproval: boolean;
  moduleById: Map<string, AiModuleMetadata>;
  focus: AskTarget | null;
};

const FallbackAssistantMessage = ({
  role,
}: {
  role: ThreadMessageLike["role"];
}) => {
  const isAssistant = role === "assistant";

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6",
          isAssistant ? "bg-zinc-100 text-zinc-800" : "bg-zinc-950 text-white",
        )}
      >
        <p className="whitespace-pre-wrap">
          <MessagePrimitive.Parts
            components={{
              Text: AssistantTextPart,
            }}
          />
        </p>
      </div>
    </div>
  );
};

const AssistantTextPart = () => <MessagePartPrimitive.Text />;
