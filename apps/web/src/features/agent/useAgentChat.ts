import { useChat } from "@ai-sdk/react";
import { createStructuredAgentRun } from "@creator/data-agent";
import type {
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentChatMetadata,
  AgentRun,
  AgentRunPatch,
  AgentStreamEvent,
  AgentToolCall,
  DiagnosisResponse,
} from "@creator/data-contracts";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AskTarget, UiMessage } from "../../types";
import { resumeAgentApproval, type ResumeAgentApprovalFetcher } from "./api";

type CreatorChatData = {
  "agent-thread": Extract<AgentStreamEvent, { type: "thread" }>;
  "agent-tool-call": Extract<
    AgentStreamEvent,
    { type: "tool-call" }
  >["toolCall"];
  "agent-run-patch": AgentRunPatch;
  "agent-run": AgentRun;
  "agent-approval": AgentApprovalRequest;
  "agent-finish": Extract<AgentStreamEvent, { type: "finish" }>;
};

type CreatorUIMessage = UIMessage<AgentChatMetadata, CreatorChatData>;

type UseAgentChatOptions = {
  activeModuleIds: string[];
  creatorId: string;
  diagnosis: DiagnosisResponse;
  fetchImpl?: typeof fetch;
  idFactory?: () => string;
  resumeFetcher?: ResumeAgentApprovalFetcher;
};

const defaultIdFactory = () => crypto.randomUUID();
const createThreadId = () => `thread-${crypto.randomUUID()}`;
const fallbackNotice = {
  label: "云端 AI 暂不可用，已切换为本地诊断结果。",
  tone: "warning",
} as const;

const createInitialWelcomeMessage = (idFactory: () => string): UiMessage => ({
  id: idFactory(),
  role: "assistant",
  content:
    "我会根据当前创作者画像和已加载模块给建议。把鼠标移到任意数据模块右上角，点「询问 AI」就能围绕该模块追问。",
  localOnly: true,
  mode: "local",
  usedModules: [],
});

const createCreatorSwitchMessage = (
  diagnosis: DiagnosisResponse,
  idFactory: () => string,
): UiMessage => ({
  id: idFactory(),
  role: "assistant",
  content: `已切换到「${diagnosis.creator.displayName}」。我重新加载了 ${diagnosis.modules.length} 个分析模块，你可以从任意数据卡片唤起我。`,
  localOnly: true,
  mode: "local",
  usedModules: diagnosis.modules.map((module) => module.id),
});

const textFromParts = (message: CreatorUIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

const dataKernelToolNames = new Set([
  "profile_dataset",
  "create_chart_data",
  "explain_metric_drop",
  "run_sql",
]);

const isDataKernelToolCall = (toolCall: AgentToolCall) =>
  dataKernelToolNames.has(toolCall.name);

const getDataParts = <Name extends keyof CreatorChatData>(
  message: CreatorUIMessage,
  name: Name,
): CreatorChatData[Name][] => {
  const type = `data-${name}`;

  return message.parts.flatMap((part) =>
    part.type === type && "data" in part
      ? [part.data as CreatorChatData[Name]]
      : [],
  );
};

const getDataPart = <Name extends keyof CreatorChatData>(
  message: CreatorUIMessage,
  name: Name,
): CreatorChatData[Name] | undefined => {
  const parts = getDataParts(message, name);

  return parts.at(-1);
};

const mergeToolCalls = (toolCalls: AgentToolCall[]) => {
  const byId = new Map<string, AgentToolCall>();

  for (const toolCall of toolCalls) {
    byId.set(toolCall.id, {
      ...byId.get(toolCall.id),
      ...toolCall,
    });
  }

  return Array.from(byId.values());
};

const mapSdkMessage = (message: CreatorUIMessage): UiMessage => {
  const agentRun = getDataPart(message, "agent-run");
  const patch = getDataPart(message, "agent-run-patch");
  const approval = getDataPart(message, "agent-approval");
  const thread = getDataPart(message, "agent-thread");
  const toolCalls = mergeToolCalls([
    ...getDataParts(message, "agent-tool-call").filter(isDataKernelToolCall),
    ...(patch?.toolCalls ?? []).filter(isDataKernelToolCall),
  ]);

  return {
    id: message.id,
    role: message.role,
    content: textFromParts(message),
    mode: message.metadata?.mode,
    usedModules:
      message.metadata?.usedModules ??
      agentRun?.usedModules ??
      patch?.usedModules,
    agentRun,
    toolCalls,
    approval,
    threadId: message.metadata?.threadId ?? thread?.threadId,
  };
};

export const useAgentChat = ({
  activeModuleIds,
  creatorId,
  diagnosis,
  fetchImpl,
  idFactory = defaultIdFactory,
  resumeFetcher = resumeAgentApproval,
}: UseAgentChatOptions) => {
  const [open, setOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<UiMessage[]>(() => [
    createInitialWelcomeMessage(idFactory),
  ]);
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState<AskTarget | null>(null);
  const [threadId, setThreadId] = useState(createThreadId);
  const [isResumingApproval, setIsResumingApproval] = useState(false);
  const [resolvedApprovalIds, setResolvedApprovalIds] = useState<Set<string>>(
    () => new Set(),
  );
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeModuleIdsRef = useRef(activeModuleIds);
  const creatorIdRef = useRef(creatorId);
  const diagnosisRef = useRef(diagnosis);
  const idFactoryRef = useRef(idFactory);
  const pendingModuleIdsRef = useRef(activeModuleIds);
  const threadIdRef = useRef(threadId);
  const hasMountedDiagnosisRef = useRef(false);

  activeModuleIdsRef.current = activeModuleIds;
  creatorIdRef.current = creatorId;
  diagnosisRef.current = diagnosis;
  idFactoryRef.current = idFactory;
  threadIdRef.current = threadId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CreatorUIMessage>({
        api: "/api/chat/stream",
        fetch: fetchImpl,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            creatorId: creatorIdRef.current,
            threadId: threadIdRef.current,
            activeModules: pendingModuleIdsRef.current,
            messages: messages
              .filter((message) => !message.metadata?.localOnly)
              .map((message) => ({
                id: message.id,
                role: message.role,
                content: textFromParts(message),
                localOnly: message.metadata?.localOnly,
              })),
          },
        }),
      }),
    [fetchImpl],
  );

  const chat = useChat<CreatorUIMessage>({
    id: threadId,
    transport,
    onError: () => {
      const fallbackRun = createStructuredAgentRun({
        diagnosis: diagnosisRef.current,
        messages: [],
        activeModules: pendingModuleIdsRef.current,
      });

      setLocalMessages((current) => [
        ...current,
        {
          id: idFactoryRef.current(),
          role: "assistant",
          content: fallbackRun.answer,
          localOnly: true,
          mode: "local",
          notice: fallbackNotice,
          usedModules: fallbackRun.usedModules,
          agentRun: fallbackRun,
        },
      ]);
    },
  });

  const remoteMessages = chat.messages.map(mapSdkMessage);
  const messages = [...localMessages, ...remoteMessages];
  const isChatting = chat.status === "submitted" || chat.status === "streaming";
  const currentApproval = [...remoteMessages, ...localMessages]
    .slice()
    .reverse()
    .map((message: UiMessage) => message.approval)
    .find(
      (
        approval: AgentApprovalRequest | undefined,
      ): approval is AgentApprovalRequest => {
        if (!approval) {
          return false;
        }
        return !resolvedApprovalIds.has(approval.id);
      },
    );

  const sendQuestion = useCallback(
    async (question: string, moduleIds = activeModuleIdsRef.current) => {
      const text = question.trim();

      if (!text || chat.status === "submitted" || chat.status === "streaming") {
        return;
      }

      setOpen(true);
      setDraft("");
      pendingModuleIdsRef.current = moduleIds;

      try {
        await chat.sendMessage({
          text,
          metadata: {
            threadId: threadIdRef.current,
          },
        });
      } catch {
        const fallbackRun = createStructuredAgentRun({
          diagnosis: diagnosisRef.current,
          messages: [{ role: "user", content: text }],
          activeModules: moduleIds,
        });

        setLocalMessages((current) => [
          ...current,
          {
            id: idFactoryRef.current(),
            role: "user",
            content: text,
            localOnly: true,
          },
          {
            id: idFactoryRef.current(),
            role: "assistant",
            content: fallbackRun.answer,
            localOnly: true,
            mode: "local",
            notice: fallbackNotice,
            usedModules: fallbackRun.usedModules,
            agentRun: fallbackRun,
          },
        ]);
      }
    },
    [chat],
  );

  const askTarget = useCallback(
    (target: AskTarget) => {
      setFocus(target);
      void sendQuestion(
        target.prompt,
        target.moduleId ? [target.moduleId] : activeModuleIdsRef.current,
      );
    },
    [sendQuestion],
  );

  const askPreset = useCallback(
    (question: string) => {
      setFocus({
        title: "自由追问",
        prompt: question,
        summary: "从当前创作者画像、指标面板和已加载 AI 模块中综合回答。",
      });
      void sendQuestion(question, activeModuleIdsRef.current);
    },
    [sendQuestion],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendQuestion(
        draft,
        focus?.moduleId ? [focus.moduleId] : activeModuleIdsRef.current,
      );
    },
    [draft, focus?.moduleId, sendQuestion],
  );

  const resumeApproval = useCallback(
    async (decision: AgentApprovalDecision) => {
      if (!currentApproval || isResumingApproval) {
        return;
      }

      setIsResumingApproval(true);

      try {
        const response = await resumeFetcher({
          threadId: currentApproval.threadId,
          approvalId: currentApproval.id,
          decision,
        });

        if (response.status === "completed") {
          setResolvedApprovalIds((current) => {
            const next = new Set(current);
            next.add(currentApproval.id);
            return next;
          });
        }

        if (response.agentRun) {
          setLocalMessages((current) => [
            ...current,
            {
              id: idFactoryRef.current(),
              role: "assistant",
              content: response.agentRun!.answer,
              localOnly: true,
              mode: "local",
              usedModules: response.agentRun!.usedModules,
              agentRun: response.agentRun,
              threadId: response.threadId,
            },
          ]);
        }
      } finally {
        setIsResumingApproval(false);
      }
    },
    [currentApproval, isResumingApproval, resolvedApprovalIds, resumeFetcher],
  );

  useEffect(() => {
    void chat.stop();
    const nextThreadId = createThreadId();
    threadIdRef.current = nextThreadId;
    setThreadId(nextThreadId);
    setResolvedApprovalIds(new Set());
    chat.setMessages([]);
  }, [creatorId]);

  useEffect(() => {
    if (!hasMountedDiagnosisRef.current) {
      hasMountedDiagnosisRef.current = true;
      return;
    }

    setFocus(null);
    setDraft("");
    setResolvedApprovalIds(new Set());
    setLocalMessages([
      createCreatorSwitchMessage(diagnosis, idFactoryRef.current),
    ]);
  }, [diagnosis]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  return {
    askPreset,
    askTarget,
    close: () => setOpen(false),
    currentApproval,
    denyApproval: () => resumeApproval("deny"),
    draft,
    endRef,
    focus,
    handleSubmit,
    isChatting,
    isResumingApproval,
    messages,
    open,
    openAgent: () => setOpen(true),
    approveApproval: () => resumeApproval("approve"),
    setDraft,
    submitQuestion: sendQuestion,
    stopGeneration: () => void chat.stop(),
    threadId,
  };
};
