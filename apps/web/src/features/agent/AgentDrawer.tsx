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
import { StopCircle } from "@phosphor-icons/react/StopCircle";
import { X } from "@phosphor-icons/react/X";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  AgentApprovalRequest,
  AgentToolCall,
  AiModuleMetadata,
} from "@creator/data-contracts";
import { Button, CardHeader, CardTitle, cn } from "@creator/ui";

import { PhosphorHoverIcon } from "../../components/ui/PhosphorHoverIcon";
import { phosphorIconWeight } from "../../constants";
import type { AskTarget, UiMessage } from "../../types";
import { AgentMarkIcon } from "./AgentMarkIcon";
import { EvidenceTagList } from "./AgentTags";
import { ChatBubble } from "./ChatBubble";
import { presetQuestions } from "./presetQuestions";

const CONTEXT_ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const CONTEXT_EXIT_EASE: [number, number, number, number] = [0.7, 0, 0.84, 0];

const CONTEXT_PANEL_VARIANTS: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      when: "afterChildren",
      height: { duration: 0.16, ease: CONTEXT_EXIT_EASE },
      opacity: { duration: 0.1, ease: CONTEXT_EXIT_EASE },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      when: "beforeChildren",
      height: { duration: 0.22, ease: CONTEXT_ENTER_EASE },
      opacity: { duration: 0.12, ease: CONTEXT_ENTER_EASE },
    },
  },
};

const CONTEXT_CONTENT_VARIANTS: Variants = {
  collapsed: {
    transition: {
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
  expanded: {
    transition: {
      delayChildren: 0.02,
      staggerChildren: 0.032,
    },
  },
};

const CONTEXT_CHILD_VARIANTS: Variants = {
  collapsed: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.09, ease: CONTEXT_EXIT_EASE },
  },
  expanded: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.14, ease: CONTEXT_ENTER_EASE },
  },
};

const CONTEXT_PANEL_REDUCED_VARIANTS: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0 } },
  expanded: { height: "auto", opacity: 1, transition: { duration: 0 } },
};

const CONTEXT_CONTENT_REDUCED_VARIANTS: Variants = {
  collapsed: { transition: { duration: 0 } },
  expanded: { transition: { duration: 0 } },
};

const CONTEXT_CHILD_REDUCED_VARIANTS: Variants = {
  collapsed: { opacity: 1, y: 0, transition: { duration: 0 } },
  expanded: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const createFocusKey = (focus: AskTarget) =>
  `${focus.moduleId ?? "__all__"}:${focus.title}`;

const SCROLL_EPSILON = 1;

const canElementScrollVertically = (element: HTMLElement) => {
  if (element.dataset.agentScrollable !== "true") {
    const overflowY = window.getComputedStyle(element).overflowY;

    if (!/(auto|scroll|overlay)/.test(overflowY)) {
      return false;
    }
  }

  return element.scrollHeight - element.clientHeight > SCROLL_EPSILON;
};

const getScrollableAncestor = (
  target: EventTarget | null,
  boundary: HTMLElement,
) => {
  let element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  while (element && boundary.contains(element)) {
    if (element instanceof HTMLElement && canElementScrollVertically(element)) {
      return element;
    }

    if (element === boundary) {
      break;
    }

    element = element.parentElement;
  }

  return null;
};

const canScrollInDirection = (element: HTMLElement, deltaY: number) => {
  if (Math.abs(deltaY) <= SCROLL_EPSILON) {
    return true;
  }

  if (deltaY < 0) {
    return element.scrollTop > SCROLL_EPSILON;
  }

  return (
    element.scrollTop + element.clientHeight <
    element.scrollHeight - SCROLL_EPSILON
  );
};

const shouldBlockDrawerScroll = (
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
) => {
  if (Math.abs(deltaY) <= SCROLL_EPSILON) {
    return false;
  }

  const scrollable = getScrollableAncestor(target, boundary);

  return !scrollable || !canScrollInDirection(scrollable, deltaY);
};

const preventOutsideDismiss = (event: Event) => {
  event.preventDefault();
};

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
  const [expandedFocusKey, setExpandedFocusKey] = useState<string | null>(null);
  const [drawerContentElement, setDrawerContentElement] =
    useState<HTMLDivElement | null>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const focusKey = focus ? createFocusKey(focus) : null;
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );
  const liveToolCalls = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find(
          (message) =>
            message.role === "assistant" &&
            !message.agentRun &&
            message.toolCalls &&
            message.toolCalls.length > 0,
        )?.toolCalls ?? [],
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
    const drawer = drawerContentElement;

    if (!drawer || !open) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      if (shouldBlockDrawerScroll(event.target, drawer, event.deltaY)) {
        event.preventDefault();
      }

      event.stopPropagation();
    };
    const handleTouchStart = (event: TouchEvent) => {
      lastTouchYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;

      if (typeof currentY !== "number") {
        return;
      }

      const previousY = lastTouchYRef.current ?? currentY;
      const deltaY = previousY - currentY;
      lastTouchYRef.current = currentY;

      if (shouldBlockDrawerScroll(event.target, drawer, deltaY)) {
        event.preventDefault();
      }

      event.stopPropagation();
    };
    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    drawer.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    drawer.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: false,
    });
    drawer.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    drawer.addEventListener("touchend", handleTouchEnd, { capture: true });
    drawer.addEventListener("touchcancel", handleTouchEnd, { capture: true });

    return () => {
      drawer.removeEventListener("wheel", handleWheel, { capture: true });
      drawer.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      });
      drawer.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
      drawer.removeEventListener("touchend", handleTouchEnd, {
        capture: true,
      });
      drawer.removeEventListener("touchcancel", handleTouchEnd, {
        capture: true,
      });
    };
  }, [drawerContentElement, open]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          ref={setDrawerContentElement}
          className="agent-drawer-content scroll-isolated fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[430px] flex-col border-l border-zinc-200 bg-white shadow-2xl outline-none"
          data-testid="agent-drawer-content"
          onInteractOutside={preventOutsideDismiss}
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
                </div>
                <div>
                  <Dialog.Title asChild>
                    <CardTitle>AI 聊天 Agent</CardTitle>
                  </Dialog.Title>
                  <Dialog.Description className="type-caption-xs mt-1 text-zinc-500">
                    按当前模块上下文回答。
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="phosphor-hover-root flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                  aria-label="关闭 AI Agent"
                >
                  <PhosphorHoverIcon className="h-4 w-4" icon={X} />
                </button>
              </Dialog.Close>
            </CardHeader>

            {focus ? (
              <AgentContextPanel
                focus={focus}
                isExpanded={expandedFocusKey === focusKey}
                onToggleExpanded={() => {
                  setExpandedFocusKey((currentKey) =>
                    currentKey === focusKey ? null : focusKey,
                  );
                }}
              />
            ) : null}

            <ThreadPrimitive.Root className="min-h-0 flex-1">
              <ThreadPrimitive.Viewport
                className="hover-scrollbar scroll-isolated h-full overflow-y-auto p-4"
                data-agent-scrollable="true"
                data-testid="agent-thread-viewport"
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
                    <div className="type-caption-xs flex items-center justify-between gap-3 text-zinc-500">
                      <AgentStreamingStatus toolCalls={liveToolCalls} />
                    </div>
                  ) : null}
                </div>
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>

            {approval ? (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="type-card-title-base text-amber-950">
                      {approval.title}
                    </p>
                    <p className="type-body-xs mt-1 text-amber-800">
                      {approval.detail}
                    </p>
                    {approval.risk ? (
                      <p className="type-body-2xs mt-1 text-amber-700">
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

            <AgentComposerCard
              focus={focus}
              isChatting={isChatting}
              onAskPreset={onAskPreset}
            />
          </AssistantRuntimeProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const AgentContextPanel = ({
  focus,
  isExpanded,
  onToggleExpanded,
}: {
  focus: AskTarget;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}) => {
  const detailsId = useId();
  const toggleLabel = isExpanded ? "收起当前询问模块" : "展开当前询问模块";
  const ToggleIcon = isExpanded ? CaretUp : CaretDown;

  return (
    <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="type-table-head text-zinc-500">当前询问模块</p>
          <p className="type-card-title-base mt-1 text-zinc-950">
            {focus.title}
          </p>
        </div>
        <button
          type="button"
          className="phosphor-hover-root type-label-xs mt-5 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          aria-controls={detailsId}
          aria-expanded={isExpanded}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleExpanded}
        >
          <span>{isExpanded ? "收起" : "展开"}</span>
          <PhosphorHoverIcon className="h-3.5 w-3.5" icon={ToggleIcon} />
        </button>
      </div>

      <AgentContextDisclosure detailsId={detailsId} isExpanded={isExpanded}>
        <AgentContextDetails focus={focus} />
      </AgentContextDisclosure>
    </div>
  );
};

const AgentContextDisclosure = ({
  children,
  detailsId,
  isExpanded,
}: {
  children: ReactNode;
  detailsId: string;
  isExpanded: boolean;
}) => {
  const reduceMotion = useReducedMotion();
  const panelVariants = reduceMotion
    ? CONTEXT_PANEL_REDUCED_VARIANTS
    : CONTEXT_PANEL_VARIANTS;
  const contentVariants = reduceMotion
    ? CONTEXT_CONTENT_REDUCED_VARIANTS
    : CONTEXT_CONTENT_VARIANTS;
  const state = isExpanded ? "expanded" : "collapsed";

  return (
    <motion.div
      id={detailsId}
      role="region"
      aria-label="当前询问模块详情"
      aria-hidden={!isExpanded}
      inert={!isExpanded}
      className={cn("overflow-hidden", !isExpanded && "pointer-events-none")}
      data-state={state}
      data-testid="agent-context-details"
      initial="collapsed"
      animate={state}
      variants={panelVariants}
    >
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="agent-context-details-content"
            className="mt-2"
            data-testid="agent-context-details-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

const AgentContextDetails = ({ focus }: { focus: AskTarget }) => {
  let revealIndex = 0;
  const nextRevealIndex = () => revealIndex++;

  return (
    <>
      {focus.summary ? (
        <AgentContextRevealItem index={nextRevealIndex()}>
          <p className="type-body-xs text-zinc-600">{focus.summary}</p>
        </AgentContextRevealItem>
      ) : null}
      {focus.evidence && focus.evidence.length > 0 ? (
        <AgentContextRevealItem index={nextRevealIndex()}>
          <EvidenceTagList className="mt-2" evidence={focus.evidence} />
        </AgentContextRevealItem>
      ) : null}
    </>
  );
};

const AgentContextRevealItem = ({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  index: number;
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      data-reveal-index={index}
      data-testid="agent-context-reveal-item"
      variants={
        reduceMotion ? CONTEXT_CHILD_REDUCED_VARIANTS : CONTEXT_CHILD_VARIANTS
      }
    >
      {children}
    </motion.div>
  );
};

const AgentComposerCard = ({
  focus,
  isChatting,
  onAskPreset,
}: {
  focus: AskTarget | null;
  isChatting: boolean;
  onAskPreset: (question: string) => void;
}) => (
  <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
    <ComposerPrimitive.Root
      className="rounded-[22px] border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_14px_36px_rgba(24,24,27,0.08)] transition focus-within:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-200/80"
      data-testid="agent-composer-card"
    >
      {focus ? (
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
          <span className="type-label-xs shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
            当前模块
          </span>
          <span className="type-control-sm min-w-0 truncate text-zinc-800">
            {focus.title}
          </span>
        </div>
      ) : null}
      <PresetQuestionList
        className="border-b border-zinc-100 px-3 py-3"
        isChatting={isChatting}
        onAskPreset={onAskPreset}
        variant="composer"
      />
      <ComposerPrimitive.Input
        aria-label="输入 AI 消息"
        className="type-body-sm max-h-44 min-h-[84px] w-full resize-none border-0 bg-transparent px-4 py-4 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="围绕当前模块继续追问..."
        submitMode="enter"
        rows={2}
        maxRows={6}
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div className="min-w-0">
          <span className="type-label-xs inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-zinc-50 px-2.5 py-1.5 text-zinc-500 ring-1 ring-inset ring-zinc-200">
            <ChatText
              className="h-3.5 w-3.5 shrink-0"
              weight={phosphorIconWeight}
            />
            <span className="truncate">
              {focus ? "按当前模块回答" : "按全部已加载模块回答"}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isChatting ? (
            <ComposerPrimitive.Cancel
              className="phosphor-hover-root type-control-sm inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="停止生成"
              title="停止生成"
            >
              <PhosphorHoverIcon className="h-4 w-4" icon={StopCircle} />
            </ComposerPrimitive.Cancel>
          ) : null}
          <ComposerPrimitive.Send
            className="phosphor-hover-root type-control-sm inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-zinc-950 text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="发送消息"
            title="发送消息"
          >
            <PhosphorHoverIcon className="h-4 w-4" icon={PaperPlaneTilt} />
          </ComposerPrimitive.Send>
        </div>
      </div>
    </ComposerPrimitive.Root>
  </div>
);

const PresetQuestionList = ({
  className,
  isChatting,
  onAskPreset,
  variant = "default",
}: {
  className?: string;
  isChatting: boolean;
  onAskPreset: (question: string) => void;
  variant?: "default" | "composer";
}) => (
  <div
    className={cn("flex flex-wrap gap-2", className)}
    data-testid={variant === "composer" ? "agent-composer-presets" : undefined}
  >
    {presetQuestions.map((question) => (
      <Button
        key={question}
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "phosphor-hover-root",
          variant === "composer" &&
            "shrink-0 rounded-full border-zinc-200 bg-white px-3 text-zinc-700 shadow-sm hover:bg-zinc-50",
        )}
        disabled={isChatting}
        onClick={() => onAskPreset(question)}
      >
        <PhosphorHoverIcon className="h-3.5 w-3.5" icon={ChatText} />
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
          "type-body-sm max-w-[92%] rounded-xl px-4 py-3",
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

const AgentStreamingStatus = ({
  toolCalls,
}: {
  toolCalls: AgentToolCall[];
}) => {
  const runningTool = toolCalls.find((tool) => tool.status === "running");
  const completedCount = toolCalls.filter((tool) =>
    ["error", "skipped", "success"].includes(tool.status),
  ).length;
  const totalCount = toolCalls.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <CircleNotch
        className="h-3.5 w-3.5 shrink-0 animate-spin"
        weight={phosphorIconWeight}
      />
      <span className="min-w-0 truncate">
        {runningTool ? `正在调用 ${runningTool.name}` : "Agent 正在准备分析"}
      </span>
      {totalCount > 0 ? (
        <span className="shrink-0 text-zinc-400">
          已完成 {completedCount}/{totalCount}
        </span>
      ) : null}
    </div>
  );
};
