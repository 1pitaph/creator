import { ChatText } from "@phosphor-icons/react/ChatText";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { Robot } from "@phosphor-icons/react/Robot";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { X } from "@phosphor-icons/react/X";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { FormEvent, RefObject } from "react";

import type { AiModuleMetadata } from "@creator/data-contracts";
import { Badge, Button, CardHeader, CardTitle, cn } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";
import type { AskTarget, UiMessage } from "../../types";
import { ChatBubble } from "./ChatBubble";
import { presetQuestions } from "./presetQuestions";

export const AgentDrawer = ({
  open,
  onClose,
  messages,
  draft,
  isChatting,
  onDraftChange,
  onSubmit,
  onAskPreset,
  moduleById,
  endRef,
  focus
}: {
  open: boolean;
  onClose: () => void;
  messages: UiMessage[];
  draft: string;
  isChatting: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAskPreset: (question: string) => void;
  moduleById: Map<string, AiModuleMetadata>;
  endRef: RefObject<HTMLDivElement | null>;
  focus: AskTarget | null;
}) => (
  <aside
    className={cn(
      "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[430px] transform flex-col border-l border-zinc-200 bg-white shadow-2xl transition duration-200",
      open ? "translate-x-0" : "translate-x-full"
    )}
    aria-hidden={!open}
  >
    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-zinc-100">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
          <Robot className="h-4 w-4" weight={phosphorIconWeight} />
        </div>
        <div>
          <CardTitle>AI 聊天 Agent</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">按当前模块上下文回答。</p>
        </div>
      </div>
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950" onClick={onClose} aria-label="关闭 AI Agent">
        <X className="h-4 w-4" weight={phosphorIconWeight} />
      </button>
    </CardHeader>

    {focus ? (
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
            <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-500">当前询问模块</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{focus.title}</p>
            {focus.summary ? <p className="mt-1 text-xs leading-5 text-zinc-600">{focus.summary}</p> : null}
            {focus.evidence && focus.evidence.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {focus.evidence.slice(0, 3).map((item) => (
                  <Badge key={item} tone="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ) : null}

    <div className="border-b border-zinc-100 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {presetQuestions.map((question) => (
          <Button key={question} type="button" size="sm" variant="ghost" onClick={() => onAskPreset(question)}>
            <ChatText className="h-3.5 w-3.5" weight={phosphorIconWeight} />
            {question}
          </Button>
        ))}
      </div>
    </div>

    <ScrollArea.Root className="min-h-0 flex-1">
      <ScrollArea.Viewport className="h-full p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} moduleById={moduleById} />
          ))}
          {isChatting ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CircleNotch className="h-3.5 w-3.5 animate-spin" weight={phosphorIconWeight} />
              Agent 正在调用分析模块
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-0.5" orientation="vertical">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-zinc-300" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>

    <form className="border-t border-zinc-100 p-4" onSubmit={onSubmit}>
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-[74px] flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-300"
          placeholder="围绕当前模块继续追问..."
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <Button type="submit" variant="primary" size="icon" disabled={isChatting || !draft.trim()} aria-label="发送消息">
          <PaperPlaneTilt className="h-4 w-4" weight={phosphorIconWeight} />
        </Button>
      </div>
    </form>
  </aside>
);
