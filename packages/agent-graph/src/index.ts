import { buildChatPayload } from "@creator/agent-core";
import {
  generateGatewayText,
  streamGatewayText,
  type AiGatewayConfig,
} from "@creator/ai-gateway";
import { createStructuredAgentRun } from "@creator/data-agent";
import {
  AgentResumeRequestSchema,
  type AgentApprovalRequest,
  type AgentChatMetadata,
  type AgentEvidenceRef,
  type AgentFact,
  type AgentMessage,
  type AgentResumeRequest,
  type AgentResumeResponse,
  type AgentRun,
  type AgentStreamEvent,
  type AgentThreadStatus,
  type AiModuleMetadata,
  type ChatRequest,
  type ChatResponse,
  type DataKernelResponse,
  type DiagnosisResponse,
  type Insight,
} from "@creator/data-contracts";
import { createDataKernelClient } from "@creator/data-kernel-client";
import {
  END,
  MemorySaver,
  START,
  Annotation,
  StateGraph,
  type BaseCheckpointSaver,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { randomUUID } from "node:crypto";

type ActiveContext = {
  modules: AiModuleMetadata[];
  insights: Insight[];
};

type UserIntent = {
  kind: "content" | "diagnostic" | "planning" | "sql" | "general";
  requiresApproval: boolean;
  metricKey?: string;
};

type AgentGraphRuntime = {
  checkpointKind: "memory" | "postgres";
};

type AgentGraphResult = {
  agentRun: AgentRun;
  approval?: AgentApprovalRequest;
  checkpoint: AgentGraphRuntime;
  mode: "mock" | "llm";
  metadata: AgentChatMetadata;
  status: AgentThreadStatus;
  threadId: string;
  usedModules: string[];
};

export type InvokeAgentGraphInput = {
  request: ChatRequest;
  diagnosis: DiagnosisResponse;
  aiConfig?: AiGatewayConfig;
};

export type ResumeAgentGraphInput = {
  request: AgentResumeRequest;
};

type AgentGraphState = {
  request: ChatRequest;
  diagnosis: DiagnosisResponse;
  threadId: string;
  messages: AgentMessage[];
  activeContext?: ActiveContext;
  intent?: UserIntent;
  kernelResponses: DataKernelResponse[];
  priorityInsight?: Insight;
  facts: AgentFact[];
  assumptions: AgentRun["assumptions"];
  actions: AgentRun["actions"];
  deferLlmSynthesis?: boolean;
  llmAnswer?: string | null;
  agentRun?: AgentRun;
  approval?: AgentApprovalRequest;
  status: AgentThreadStatus;
  checkpoint: AgentGraphRuntime;
};

const State = Annotation.Root({
  request: Annotation<ChatRequest>(),
  diagnosis: Annotation<DiagnosisResponse>(),
  threadId: Annotation<string>(),
  messages: Annotation<AgentMessage[]>(),
  activeContext: Annotation<ActiveContext | undefined>(),
  intent: Annotation<UserIntent | undefined>(),
  kernelResponses: Annotation<DataKernelResponse[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  priorityInsight: Annotation<Insight | undefined>(),
  facts: Annotation<AgentFact[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  assumptions: Annotation<AgentRun["assumptions"]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  actions: Annotation<AgentRun["actions"]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  deferLlmSynthesis: Annotation<boolean | undefined>(),
  llmAnswer: Annotation<string | null | undefined>(),
  agentRun: Annotation<AgentRun | undefined>(),
  approval: Annotation<AgentApprovalRequest | undefined>(),
  status: Annotation<AgentThreadStatus>(),
  checkpoint: Annotation<AgentGraphRuntime>(),
});

const writableKeywords = [
  "采纳",
  "写入",
  "加入计划",
  "更新",
  "标记",
  "完成",
  "执行",
  "保存",
];
const diagnosticKeywords = ["为什么", "下降", "不好", "原因", "波动", "诊断"];
const contentKeywords = ["选题", "拍什么", "下一条", "内容", "标题"];
const planningKeywords = ["复盘", "今天", "本周", "行动", "计划"];
const sqlKeywords = ["sql", "查询", "表格", "明细", "最高", "最低", "排序"];

const checkpointState: {
  checkpointer?: BaseCheckpointSaver;
  kind?: AgentGraphRuntime["checkpointKind"];
  promise?: Promise<{
    checkpointer: BaseCheckpointSaver;
    kind: AgentGraphRuntime["checkpointKind"];
  }>;
} = {};
const aiConfigByThread = new Map<string, AiGatewayConfig | undefined>();

export const resetAgentGraphRuntimeForTests = () => {
  checkpointState.checkpointer = undefined;
  checkpointState.kind = undefined;
  checkpointState.promise = undefined;
  aiConfigByThread.clear();
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase()),
  );

const createThreadId = () => `thread-${randomUUID()}`;

const filterModelMessages = (messages: AgentMessage[]) =>
  messages.filter(
    (message) => !message.localOnly && message.content.trim().length > 0,
  );

const selectContext = (
  diagnosis: DiagnosisResponse,
  activeModules: string[],
): ActiveContext => {
  const allowAll = activeModules.length === 0;

  return {
    modules: diagnosis.modules.filter(
      (module) => allowAll || activeModules.includes(module.id),
    ),
    insights: diagnosis.insights.filter(
      (insight) => allowAll || activeModules.includes(insight.moduleId),
    ),
  };
};

const inferIntent = (messages: AgentMessage[]): UserIntent => {
  const latest = messages.at(-1)?.content ?? "";
  const requiresApproval = includesAny(latest, writableKeywords);

  if (includesAny(latest, sqlKeywords)) {
    return { kind: "sql", requiresApproval };
  }

  if (includesAny(latest, contentKeywords)) {
    return { kind: "content", requiresApproval };
  }

  if (includesAny(latest, diagnosticKeywords)) {
    return {
      kind: "diagnostic",
      requiresApproval,
      metricKey: latest.includes("转粉") ? "followerConversionRate" : "views",
    };
  }

  if (includesAny(latest, planningKeywords)) {
    return { kind: "planning", requiresApproval };
  }

  return { kind: "general", requiresApproval };
};

const pickPriorityInsight = (insights: Insight[]) =>
  insights.find((insight) => insight.severity === "critical") ??
  insights.find((insight) => insight.severity === "warning") ??
  insights.find((insight) => insight.severity === "notice") ??
  insights[0];

const getCheckpoint = async () => {
  if (checkpointState.checkpointer && checkpointState.kind) {
    return {
      checkpointer: checkpointState.checkpointer,
      kind: checkpointState.kind,
    };
  }

  checkpointState.promise ??= (async () => {
    const checkpointUrl = process.env.AGENT_CHECKPOINT_URL;

    if (checkpointUrl) {
      try {
        const postgres = PostgresSaver.fromConnString(checkpointUrl);
        await postgres.setup();
        checkpointState.checkpointer = postgres;
        checkpointState.kind = "postgres";
        return { checkpointer: postgres, kind: "postgres" as const };
      } catch {
        // Local development should keep moving even when Postgres is absent.
      }
    }

    const memory = new MemorySaver();
    checkpointState.checkpointer = memory;
    checkpointState.kind = "memory";
    return { checkpointer: memory, kind: "memory" as const };
  })();

  return checkpointState.promise;
};

const buildEvidenceFromRun = (agentRun: AgentRun): AgentEvidenceRef[] =>
  agentRun.evidence;

const appendApprovalNotice = (
  agentRun: AgentRun,
  approval: AgentApprovalRequest,
): AgentRun => ({
  ...agentRun,
  answer: `${agentRun.answer}\n\n需要你确认后我再继续：${approval.title}。`,
});

const createApprovalRequest = (
  state: AgentGraphState,
  agentRun: AgentRun,
): AgentApprovalRequest | undefined => {
  if (!state.intent?.requiresApproval || agentRun.actions.length === 0) {
    return undefined;
  }

  const actionIds = agentRun.actions.slice(0, 3).map((action) => action.id);

  return {
    id: `approval-${randomUUID()}`,
    threadId: state.threadId,
    actionIds,
    title: "确认写入行动计划",
    detail: `将 ${actionIds.length} 条建议写入当前创作者的行动计划。`,
    risk: "这是有副作用的业务动作，当前版本只在确认后返回审计记录，不直接修改 mock 数据。",
    createdAt: new Date().toISOString(),
  };
};

const createInitialState = (
  input: InvokeAgentGraphInput,
  checkpoint: AgentGraphRuntime,
  options: { deferLlmSynthesis?: boolean } = {},
): AgentGraphState => {
  const threadId = input.request.threadId ?? createThreadId();

  return {
    request: input.request,
    diagnosis: input.diagnosis,
    threadId,
    messages: [],
    kernelResponses: [],
    facts: [],
    assumptions: [],
    actions: [],
    deferLlmSynthesis: options.deferLlmSynthesis,
    status: "running",
    checkpoint,
  };
};

const hydrateRequest = async (state: AgentGraphState) => ({
  threadId: state.request.threadId ?? state.threadId,
  messages: filterModelMessages(state.request.messages),
  status: "running" as const,
});

const selectActiveContext = async (state: AgentGraphState) => ({
  activeContext: selectContext(state.diagnosis, state.request.activeModules),
});

const inferUserIntent = async (state: AgentGraphState) => ({
  intent: inferIntent(state.messages),
});

const buildEvidence = async (state: AgentGraphState) => {
  if (!process.env.DATA_KERNEL_URL) {
    return { kernelResponses: [] };
  }

  const client = createDataKernelClient();
  const calls: Array<Promise<DataKernelResponse>> = [
    client.runTool({
      diagnosis: state.diagnosis,
      tool: "profile_dataset",
      requestId: `${state.threadId}-profile`,
    }),
    client.runTool({
      diagnosis: state.diagnosis,
      tool: "create_chart_data",
      input: {
        metricKeys: [
          "views",
          "completionRate",
          "interactionRate",
          "followerConversionRate",
        ],
      },
      requestId: `${state.threadId}-chart`,
    }),
  ];

  if (state.intent?.kind === "diagnostic") {
    calls.push(
      client.runTool({
        diagnosis: state.diagnosis,
        tool: "explain_metric_drop",
        input: {
          metricKey: state.intent.metricKey ?? "views",
        },
        requestId: `${state.threadId}-metric-drop`,
      }),
    );
  }

  if (state.intent?.kind === "sql") {
    calls.push(
      client.runTool({
        diagnosis: state.diagnosis,
        tool: "run_sql",
        input: {
          sql: "select date, views, completionRate, interactionRate, followerConversionRate from history order by views desc",
        },
        requestId: `${state.threadId}-sql`,
        limits: {
          maxRows: 20,
        },
      }),
    );
  }

  const kernelResponses = await Promise.all(calls);
  return { kernelResponses };
};

const rankPriorityInsight = async (state: AgentGraphState) => ({
  priorityInsight: pickPriorityInsight(state.activeContext?.insights ?? []),
});

const synthesizeFactsAssumptions = async (state: AgentGraphState) => {
  const previewRun = createStructuredAgentRun({
    diagnosis: state.diagnosis,
    messages: state.messages,
    activeModules: state.request.activeModules,
    kernelResponses: state.kernelResponses,
  });

  return {
    facts: previewRun.facts,
    assumptions: previewRun.assumptions,
  };
};

const synthesizeActions = async (state: AgentGraphState) => {
  const previewRun = createStructuredAgentRun({
    diagnosis: state.diagnosis,
    messages: state.messages,
    activeModules: state.request.activeModules,
    kernelResponses: state.kernelResponses,
  });

  return {
    actions: previewRun.actions,
  };
};

const llmOrDeterministicSynthesis = async (state: AgentGraphState) => {
  if (state.deferLlmSynthesis) {
    return { llmAnswer: null };
  }

  const activeContext =
    state.activeContext ??
    selectContext(state.diagnosis, state.request.activeModules);
  const payload = buildChatPayload(
    {
      creator: state.diagnosis.creator,
      metrics: state.diagnosis.metrics,
      modules: activeContext.modules,
      insights: activeContext.insights,
    },
    state.messages,
  );
  const llmAnswer = await generateGatewayText(
    {
      messages: payload,
      temperature: 0.4,
    },
    aiConfigByThread.get(state.threadId),
  );

  return { llmAnswer };
};

const finalizeAgentRun = async (state: AgentGraphState) => {
  const agentRun = createStructuredAgentRun({
    diagnosis: state.diagnosis,
    messages: state.messages,
    activeModules: state.request.activeModules,
    llmAnswer: state.llmAnswer,
    kernelResponses: state.kernelResponses,
  });
  const approval = createApprovalRequest(state, agentRun);
  const finalRun = approval
    ? appendApprovalNotice(agentRun, approval)
    : agentRun;

  return {
    agentRun: finalRun,
    approval,
    evidence: buildEvidenceFromRun(finalRun),
    status: approval ? ("awaiting_approval" as const) : ("completed" as const),
  };
};

const createCompiledGraph = async () => {
  const checkpoint = await getCheckpoint();
  const graph = new StateGraph(State)
    .addNode("hydrate_request", hydrateRequest)
    .addNode("select_active_context", selectActiveContext)
    .addNode("infer_user_intent", inferUserIntent)
    .addNode("build_evidence", buildEvidence)
    .addNode("rank_priority_insight", rankPriorityInsight)
    .addNode("synthesize_facts_assumptions", synthesizeFactsAssumptions)
    .addNode("synthesize_actions", synthesizeActions)
    .addNode("llm_or_deterministic_synthesis", llmOrDeterministicSynthesis)
    .addNode("finalize_agent_run", finalizeAgentRun)
    .addEdge(START, "hydrate_request")
    .addEdge("hydrate_request", "select_active_context")
    .addEdge("select_active_context", "infer_user_intent")
    .addEdge("infer_user_intent", "build_evidence")
    .addEdge("build_evidence", "rank_priority_insight")
    .addEdge("rank_priority_insight", "synthesize_facts_assumptions")
    .addEdge("synthesize_facts_assumptions", "synthesize_actions")
    .addEdge("synthesize_actions", "llm_or_deterministic_synthesis")
    .addEdge("llm_or_deterministic_synthesis", "finalize_agent_run")
    .addEdge("finalize_agent_run", END)
    .compile({
      checkpointer: checkpoint.checkpointer,
      name: "creator-agent-graph",
    });

  return {
    graph,
    checkpoint: {
      checkpointKind: checkpoint.kind,
    } satisfies AgentGraphRuntime,
  };
};

export const invokeAgentGraph = async (
  input: InvokeAgentGraphInput,
): Promise<AgentGraphResult> => {
  const { graph, checkpoint } = await createCompiledGraph();
  const initialState = createInitialState(input, checkpoint);
  aiConfigByThread.set(initialState.threadId, input.aiConfig);

  const result = (await graph
    .invoke(initialState, {
      configurable: {
        thread_id: initialState.threadId,
      },
    })
    .finally(() => {
      aiConfigByThread.delete(initialState.threadId);
    })) as AgentGraphState;

  if (!result.agentRun) {
    throw new Error("Agent graph completed without an AgentRun.");
  }

  const mode = result.agentRun.mode === "llm-assisted" ? "llm" : "mock";

  return {
    agentRun: result.agentRun,
    approval: result.approval,
    checkpoint,
    mode,
    metadata: {
      agentRunId: result.agentRun.id,
      mode,
      threadId: result.threadId,
      usedModules: result.agentRun.usedModules,
    },
    status: result.status,
    threadId: result.threadId,
    usedModules: result.agentRun.usedModules,
  };
};

export const toLegacyChatResponse = (
  result: AgentGraphResult,
): ChatResponse => ({
  reply: result.agentRun.answer,
  usedModules: result.usedModules,
  mode: result.mode,
  agentRun: result.agentRun,
  threadId: result.threadId,
  status: result.status,
  approval: result.approval,
});

const event = (value: AgentStreamEvent) => value;

const graphNodeLabels: Record<string, string> = {
  hydrate_request: "整理请求上下文",
  select_active_context: "选择当前模块上下文",
  infer_user_intent: "识别用户意图",
  build_evidence: "构建数据证据",
  rank_priority_insight: "排序优先洞察",
  synthesize_facts_assumptions: "合成事实与假设",
  synthesize_actions: "合成行动建议",
  llm_or_deterministic_synthesis: "准备自然语言回答",
  finalize_agent_run: "生成 AgentRun 审计记录",
};

const createGraphNodeToolCall = (
  threadId: string,
  nodeName: string,
): AgentRun["toolCalls"][number] => ({
  id: `${threadId}-${nodeName}`,
  name: nodeName,
  status: "success",
  inputSummary: graphNodeLabels[nodeName] ?? nodeName,
  outputSummary: `${graphNodeLabels[nodeName] ?? nodeName} 已完成。`,
  evidenceIds: [],
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
});

const streamTextChunks = async function* (
  text: string,
): AsyncGenerator<string> {
  const chunks = text.match(/(?:[^\n。！？；]+[。！？；]?\n*)|\n+/g) ?? [text];

  for (const chunk of chunks) {
    if (chunk) {
      yield chunk;
    }
  }
};

const buildGatewayPayload = (state: AgentGraphState) => {
  const activeContext =
    state.activeContext ??
    selectContext(state.diagnosis, state.request.activeModules);

  return buildChatPayload(
    {
      creator: state.diagnosis.creator,
      metrics: state.diagnosis.metrics,
      modules: activeContext.modules,
      insights: activeContext.insights,
    },
    state.messages,
  );
};

const getLlmTextStream = (
  state: AgentGraphState,
  input: InvokeAgentGraphInput,
): ReturnType<typeof streamGatewayText> =>
  streamGatewayText(
    {
      messages: buildGatewayPayload(state),
      temperature: 0.4,
    },
    input.aiConfig,
  );

const recreateFinalRun = (state: AgentGraphState, llmAnswer: string | null) => {
  const agentRun = createStructuredAgentRun({
    diagnosis: state.diagnosis,
    messages: state.messages,
    activeModules: state.request.activeModules,
    llmAnswer,
    kernelResponses: state.kernelResponses,
  });
  const approval = createApprovalRequest(state, agentRun);
  const finalRun = approval
    ? appendApprovalNotice(agentRun, approval)
    : agentRun;

  return {
    agentRun: finalRun,
    approval,
    status: approval ? ("awaiting_approval" as const) : ("completed" as const),
  };
};

const getGraphState = async (
  graph: Awaited<ReturnType<typeof createCompiledGraph>>["graph"],
  threadId: string,
) => {
  const snapshot = await graph.getState({
    configurable: {
      thread_id: threadId,
    },
  });

  return snapshot.values as AgentGraphState;
};

export async function* streamAgentGraphEvents(
  input: InvokeAgentGraphInput,
): AsyncGenerator<AgentStreamEvent> {
  const threadId = input.request.threadId ?? createThreadId();
  const { graph, checkpoint } = await createCompiledGraph();
  const initialState = createInitialState(
    {
      ...input,
      request: {
        ...input.request,
        threadId,
      },
    },
    checkpoint,
    { deferLlmSynthesis: true },
  );

  yield event({ type: "thread", threadId, status: "running" });

  const stream = await graph.stream(initialState, {
    configurable: {
      thread_id: threadId,
    },
    streamMode: "updates",
  });

  for await (const update of stream) {
    if (!update || typeof update !== "object") {
      continue;
    }

    for (const nodeName of Object.keys(update as Record<string, unknown>)) {
      yield event({
        type: "tool-call",
        toolCall: createGraphNodeToolCall(threadId, nodeName),
      });
    }
  }

  const deferredState = await getGraphState(graph, threadId);
  const streamedChunks: string[] = [];
  const llmStream = getLlmTextStream(deferredState, input);

  for await (const delta of llmStream ??
    streamTextChunks(deferredState.agentRun?.answer ?? "")) {
    streamedChunks.push(delta);
    yield event({ type: "text-delta", delta });
  }

  const streamedAnswer = streamedChunks.join("").trim();
  const final =
    llmStream && streamedAnswer
      ? recreateFinalRun(deferredState, streamedAnswer)
      : {
          agentRun: deferredState.agentRun,
          approval: deferredState.approval,
          status: deferredState.status,
        };

  if (!final.agentRun) {
    throw new Error("Agent graph stream completed without an AgentRun.");
  }

  const approvalNotice = final.approval
    ? `\n\n需要你确认后我再继续：${final.approval.title}。`
    : "";

  if (llmStream && approvalNotice && streamedAnswer) {
    yield event({ type: "text-delta", delta: approvalNotice });
  }

  for (const toolCall of final.agentRun.toolCalls) {
    yield event({ type: "tool-call", toolCall });
  }

  await graph.updateState(
    {
      configurable: {
        thread_id: threadId,
      },
    },
    {
      agentRun: final.agentRun,
      approval: final.approval,
      status: final.status,
    },
    "finalize_agent_run",
  );

  yield event({
    type: "agent-run-patch",
    patch: {
      id: final.agentRun.id,
      usedModules: final.agentRun.usedModules,
      toolCalls: final.agentRun.toolCalls,
      evidence: final.agentRun.evidence,
      facts: final.agentRun.facts,
      assumptions: final.agentRun.assumptions,
      actions: final.agentRun.actions,
      followUpQuestions: final.agentRun.followUpQuestions,
    },
  });

  yield event({ type: "agent-run", agentRun: final.agentRun });

  if (final.approval) {
    yield event({ type: "approval-requested", approval: final.approval });
  }

  yield event({
    type: "finish",
    threadId,
    status: final.status,
    agentRun: final.agentRun,
  });
}

export const resumeAgentGraph = async ({
  request,
}: ResumeAgentGraphInput): Promise<AgentResumeResponse> => {
  const parsed = AgentResumeRequestSchema.parse(request);
  const approved = parsed.decision === "approve";
  const { graph } = await createCompiledGraph();
  let previousState: AgentGraphState | undefined;

  try {
    previousState = await getGraphState(graph, parsed.threadId);
  } catch {
    previousState = undefined;
  }
  const previousRun = previousState?.agentRun;
  const previousApproval = previousState?.approval;
  const approvalMatches =
    previousApproval?.id === parsed.approvalId ||
    previousRun?.answer.includes(parsed.approvalId);

  if (previousApproval && !approvalMatches) {
    return {
      threadId: parsed.threadId,
      status: "error",
      agentRun: {
        id: `resume-${Date.now()}`,
        mode: "deterministic",
        answer: "没有找到匹配的待审批动作，本次不会写入行动计划。",
        usedModules: previousRun?.usedModules ?? [],
        toolCalls: [
          {
            id: `resume-tool-${randomUUID()}`,
            name: "approval_resume",
            status: "error",
            inputSummary: `审批 ${parsed.approvalId}: ${parsed.decision}`,
            outputSummary: "审批 ID 与当前线程待审批项不匹配。",
            evidenceIds: [],
            error: "APPROVAL_NOT_FOUND",
          },
        ],
        evidence: previousRun?.evidence ?? [],
        facts: previousRun?.facts ?? [],
        assumptions: previousRun?.assumptions ?? [],
        actions: previousRun?.actions ?? [],
        followUpQuestions: previousRun?.followUpQuestions ?? [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const resumedRun: AgentRun = {
    id: `resume-${Date.now()}`,
    mode: "deterministic",
    answer: approved
      ? "已确认该动作。当前版本会记录审批结果，后续接入真实写入工具。"
      : "已拒绝该动作，不会写入行动计划。",
    usedModules: previousRun?.usedModules ?? [],
    toolCalls: [
      ...(previousRun?.toolCalls ?? []),
      {
        id: `resume-tool-${randomUUID()}`,
        name: "approval_resume",
        status: "success",
        inputSummary: `审批 ${parsed.approvalId}: ${parsed.decision}`,
        outputSummary: approved ? "审批通过。" : "审批拒绝。",
        evidenceIds: [],
      },
    ],
    evidence: previousRun?.evidence ?? [],
    facts: previousRun?.facts ?? [],
    assumptions: previousRun?.assumptions ?? [],
    actions:
      previousRun?.actions.map((action) => ({
        ...action,
        status: previousApproval?.actionIds.includes(action.id)
          ? approved
            ? "accepted"
            : "dismissed"
          : action.status,
      })) ?? [],
    followUpQuestions: previousRun?.followUpQuestions ?? [],
    createdAt: new Date().toISOString(),
  };

  if (previousState) {
    await graph.updateState(
      {
        configurable: {
          thread_id: parsed.threadId,
        },
      },
      {
        agentRun: resumedRun,
        status: "completed",
      },
      "finalize_agent_run",
    );
  }

  return {
    threadId: parsed.threadId,
    status: "completed",
    agentRun: resumedRun,
  };
};
