import { createMockAgentReply, type AgentContext } from "@creator/agent-core";
import type { DiagnosisResponse } from "@creator/data-contracts";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AskTarget, UiMessage } from "../../types";
import { fetchAgentReply, type ChatFetcher } from "./api";

type UseAgentChatOptions = {
  activeModuleIds: string[];
  creatorId: string;
  diagnosis: DiagnosisResponse;
  fetcher?: ChatFetcher;
  idFactory?: () => string;
  streamDelayMs?: number;
};

const defaultIdFactory = () => crypto.randomUUID();

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createInitialWelcomeMessage = (idFactory: () => string): UiMessage => ({
  id: idFactory(),
  role: "assistant",
  content: "我会根据当前创作者画像和已加载模块给建议。把鼠标移到任意数据模块右上角，点「询问 AI」就能围绕该模块追问。",
  mode: "local",
  usedModules: []
});

const createCreatorSwitchMessage = (diagnosis: DiagnosisResponse, idFactory: () => string): UiMessage => ({
  id: idFactory(),
  role: "assistant",
  content: `已切换到「${diagnosis.creator.displayName}」。我重新加载了 ${diagnosis.modules.length} 个分析模块，你可以从任意数据卡片唤起我。`,
  mode: "local",
  usedModules: diagnosis.modules.map((module) => module.id)
});

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export const useAgentChat = ({
  activeModuleIds,
  creatorId,
  diagnosis,
  fetcher = fetchAgentReply,
  idFactory = defaultIdFactory,
  streamDelayMs = 8
}: UseAgentChatOptions) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>(() => [createInitialWelcomeMessage(idFactory)]);
  const [draft, setDraft] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [focus, setFocus] = useState<AskTarget | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const creatorIdRef = useRef(creatorId);
  const idFactoryRef = useRef(idFactory);
  const messagesRef = useRef(messages);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isChattingRef = useRef(false);
  const hasMountedDiagnosisRef = useRef(false);

  const agentContext: AgentContext = useMemo(
    () => ({
      creator: diagnosis.creator,
      metrics: diagnosis.metrics,
      modules: diagnosis.modules,
      insights: diagnosis.insights
    }),
    [diagnosis]
  );

  const updateMessages = useCallback((updater: (current: UiMessage[]) => UiMessage[]) => {
    setMessages((current) => {
      const nextMessages = updater(current);
      messagesRef.current = nextMessages;
      return nextMessages;
    });
  }, []);

  const replaceMessages = useCallback((nextMessages: UiMessage[]) => {
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
  }, []);

  creatorIdRef.current = creatorId;
  idFactoryRef.current = idFactory;

  const isActiveRequest = useCallback(
    (requestId: number, signal: AbortSignal, requestCreatorId: string) =>
      requestIdRef.current === requestId && creatorIdRef.current === requestCreatorId && !signal.aborted,
    []
  );

  const addStreamingAssistantMessage = useCallback(
    async (reply: string, usedModules: string[], mode: UiMessage["mode"], requestId: number, signal: AbortSignal, requestCreatorId: string) => {
      if (!isActiveRequest(requestId, signal, requestCreatorId)) {
        return;
      }

      const id = idFactoryRef.current();
      updateMessages((current) => [
        ...current,
        {
          id,
          role: "assistant",
          content: "",
          usedModules,
          mode
        }
      ]);

      if (streamDelayMs <= 0) {
        updateMessages((current) => current.map((message) => (message.id === id ? { ...message, content: reply } : message)));
        return;
      }

      for (let index = 1; index <= reply.length; index += 2) {
        if (!isActiveRequest(requestId, signal, requestCreatorId)) {
          return;
        }

        const content = reply.slice(0, index);
        updateMessages((current) => current.map((message) => (message.id === id ? { ...message, content } : message)));
        await wait(streamDelayMs);
      }

      if (isActiveRequest(requestId, signal, requestCreatorId)) {
        updateMessages((current) => current.map((message) => (message.id === id ? { ...message, content: reply } : message)));
      }
    },
    [isActiveRequest, streamDelayMs, updateMessages]
  );

  const sendQuestion = useCallback(
    async (question: string, moduleIds = activeModuleIds) => {
      const text = question.trim();

      if (!text || isChattingRef.current) {
        return;
      }

      setOpen(true);
      const userMessage: UiMessage = {
        id: idFactoryRef.current(),
        role: "user",
        content: text
      };
      const nextMessages = [...messagesRef.current, userMessage];
      replaceMessages(nextMessages);
      setDraft("");
      setIsChatting(true);
      isChattingRef.current = true;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const requestCreatorId = creatorId;

      try {
        const payload = await fetcher(
          {
            creatorId,
            messages: nextMessages.map(({ role, content }) => ({ role, content })),
            activeModules: moduleIds
          },
          controller.signal
        );

        if (!isActiveRequest(requestId, controller.signal, requestCreatorId)) {
          return;
        }

        await addStreamingAssistantMessage(payload.reply, payload.usedModules, payload.mode, requestId, controller.signal, requestCreatorId);
      } catch (error: unknown) {
        if (isAbortError(error) || !isActiveRequest(requestId, controller.signal, requestCreatorId)) {
          return;
        }

        const fallbackContext = {
          ...agentContext,
          modules: agentContext.modules.filter((module) => moduleIds.length === 0 || moduleIds.includes(module.id)),
          insights: agentContext.insights.filter((insight) => moduleIds.length === 0 || moduleIds.includes(insight.moduleId))
        };
        const reply = createMockAgentReply(fallbackContext, nextMessages);
        await addStreamingAssistantMessage(reply, moduleIds.length > 0 ? moduleIds : activeModuleIds, "local", requestId, controller.signal, requestCreatorId);
      } finally {
        if (isActiveRequest(requestId, controller.signal, requestCreatorId)) {
          setIsChatting(false);
          isChattingRef.current = false;
        }
      }
    },
    [activeModuleIds, addStreamingAssistantMessage, agentContext, creatorId, fetcher, isActiveRequest, replaceMessages]
  );

  const askTarget = useCallback(
    (target: AskTarget) => {
      setFocus(target);
      void sendQuestion(target.prompt, target.moduleId ? [target.moduleId] : activeModuleIds);
    },
    [activeModuleIds, sendQuestion]
  );

  const askPreset = useCallback((question: string) => {
    setFocus({
      title: "自由追问",
      prompt: question,
      summary: "从当前创作者画像、指标面板和已加载 AI 模块中综合回答。"
    });
    setDraft(question);
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendQuestion(draft, focus?.moduleId ? [focus.moduleId] : activeModuleIds);
    },
    [activeModuleIds, draft, focus?.moduleId, sendQuestion]
  );

  useEffect(() => {
    abortControllerRef.current?.abort();
    requestIdRef.current += 1;
    setIsChatting(false);
    isChattingRef.current = false;
  }, [creatorId]);

  useEffect(() => {
    if (!hasMountedDiagnosisRef.current) {
      hasMountedDiagnosisRef.current = true;
      return;
    }

    setFocus(null);
    setDraft("");
    replaceMessages([createCreatorSwitchMessage(diagnosis, idFactoryRef.current)]);
  }, [diagnosis.creator.id, diagnosis.creator.displayName, diagnosis.modules, replaceMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  return {
    askPreset,
    askTarget,
    close: () => setOpen(false),
    draft,
    endRef,
    focus,
    handleSubmit,
    isChatting,
    messages,
    open,
    openAgent: () => setOpen(true),
    setDraft
  };
};
