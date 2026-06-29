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
  AiModuleMetadata,
} from "@creator/data-contracts";
import { Button, CardHeader, CardTitle, cn } from "@creator/ui";

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
                isExpanded={expandedFocusKey === focusKey}
                onAskPreset={onAskPreset}
                onToggleExpanded={() => {
                  setExpandedFocusKey((currentKey) =>
                    currentKey === focusKey ? null : focusKey,
                  );
                }}
              />
            ) : (
              <PresetQuestionSection
                isChatting={isChatting}
                onAskPreset={onAskPreset}
              />
            )}

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
  isExpanded,
  onAskPreset,
  onToggleExpanded,
}: {
  focus: AskTarget;
  isChatting: boolean;
  isExpanded: boolean;
  onAskPreset: (question: string) => void;
  onToggleExpanded: () => void;
}) => {
  const detailsId = useId();
  const toggleLabel = isExpanded ? "收起当前询问模块" : "展开当前询问模块";
  const ToggleIcon = isExpanded ? CaretUp : CaretDown;

  return (
    <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-500">当前询问模块</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">
            {focus.title}
          </p>
        </div>
        <button
          type="button"
          className="mt-5 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          aria-controls={detailsId}
          aria-expanded={isExpanded}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleExpanded}
        >
          <span>{isExpanded ? "收起" : "展开"}</span>
          <ToggleIcon className="h-3.5 w-3.5" weight={phosphorIconWeight} />
        </button>
      </div>

      <AgentContextDisclosure detailsId={detailsId} isExpanded={isExpanded}>
        <AgentContextDetails
          focus={focus}
          isChatting={isChatting}
          onAskPreset={onAskPreset}
        />
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

const AgentContextDetails = ({
  focus,
  isChatting,
  onAskPreset,
}: {
  focus: AskTarget;
  isChatting: boolean;
  onAskPreset: (question: string) => void;
}) => {
  let revealIndex = 0;
  const nextRevealIndex = () => revealIndex++;

  return (
    <>
      {focus.summary ? (
        <AgentContextRevealItem index={nextRevealIndex()}>
          <p className="text-xs leading-5 text-zinc-600">{focus.summary}</p>
        </AgentContextRevealItem>
      ) : null}
      {focus.evidence && focus.evidence.length > 0 ? (
        <AgentContextRevealItem index={nextRevealIndex()}>
          <EvidenceTagList className="mt-2" evidence={focus.evidence} />
        </AgentContextRevealItem>
      ) : null}
      <AgentContextRevealItem
        className="mt-3 border-t border-zinc-200/70 pt-3"
        index={nextRevealIndex()}
      >
        <div className="flex flex-wrap gap-2">
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
      </AgentContextRevealItem>
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
