import type {
  AgentAction,
  AgentAssumption,
  AgentEvidenceRef,
  AgentFact,
  AgentMessage,
  AgentRun,
  AgentToolCall,
  AiModuleMetadata,
  DataKernelResponse,
  DiagnosisResponse,
  Insight
} from "@creator/data-contracts";

export type DataAgentInput = {
  diagnosis: DiagnosisResponse;
  messages: AgentMessage[];
  activeModules?: string[];
  llmAnswer?: string | null;
  kernelResponses?: DataKernelResponse[];
  kernelToolCalls?: AgentToolCall[];
  now?: Date;
};

type ActiveContext = {
  modules: AiModuleMetadata[];
  insights: Insight[];
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signedPct = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
const compact = (value: number) =>
  Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);

const includesAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const createIdFactory = (prefix: string) => {
  let index = 0;
  return () => `${prefix}-${(index += 1).toString().padStart(2, "0")}`;
};

const filterActiveContext = (diagnosis: DiagnosisResponse, activeModules: string[] = []): ActiveContext => {
  const allowsAll = activeModules.length === 0;

  return {
    modules: diagnosis.modules.filter((module) => allowsAll || activeModules.includes(module.id)),
    insights: diagnosis.insights.filter((insight) => allowsAll || activeModules.includes(insight.moduleId))
  };
};

const createToolCall = (
  id: string,
  name: string,
  inputSummary: string,
  outputSummary: string,
  evidenceIds: string[]
): AgentToolCall => ({
  id,
  name,
  status: "success",
  inputSummary,
  outputSummary,
  evidenceIds,
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString()
});

export const createKernelToolCall = (
  response: DataKernelResponse,
  index: number,
  overrides: Partial<Pick<AgentToolCall, "finishedAt" | "id" | "startedAt">> = {}
): AgentToolCall => ({
  id: overrides.id ?? `kernel-${index + 1}`,
  name: response.tool,
  status: response.ok ? "success" : "error",
  inputSummary: `调用 Python 数据内核工具 ${response.tool}。`,
  outputSummary: response.ok
    ? response.artifacts[0]?.title ?? response.evidence[0]?.excerpt ?? "数据内核返回成功。"
    : response.error?.message ?? "数据内核调用失败。",
  evidenceIds: response.evidence.map((item, evidenceIndex) => `ev-kernel-${index + 1}-${evidenceIndex + 1}`),
  error: response.error?.message,
  startedAt: overrides.startedAt,
  finishedAt: overrides.finishedAt
});

const createKernelEvidence = (responses: DataKernelResponse[]): AgentEvidenceRef[] =>
  responses.flatMap((response, responseIndex) =>
    response.evidence.map((item, evidenceIndex) => ({
      id: `ev-kernel-${responseIndex + 1}-${evidenceIndex + 1}`,
      label: `${response.tool}: ${item.sourceTable}`,
      sourceType: "agent-tool" as const,
      sourceId: response.requestId,
      metricKey: item.metricKey ?? undefined,
      excerpt: item.excerpt
    }))
  );

const pickPriorityInsight = (insights: Insight[]) =>
  insights.find((insight) => insight.severity === "critical") ??
  insights.find((insight) => insight.severity === "warning") ??
  insights[0];

const createEvidence = (diagnosis: DiagnosisResponse, context: ActiveContext): AgentEvidenceRef[] => {
  const metrics = diagnosis.metrics.summary;
  const topContent = diagnosis.metrics.topContents[0];
  const priorityInsight = pickPriorityInsight(context.insights);

  return [
    {
      id: "ev-profile",
      label: "创作者画像",
      sourceType: "creator-profile",
      sourceId: diagnosis.creator.id,
      excerpt: `${diagnosis.creator.displayName} 属于${diagnosis.creator.domain}，阶段为 ${diagnosis.creator.lifecycle}，目标是 ${diagnosis.creator.goals.join("、")}。`
    },
    {
      id: "ev-summary",
      label: "近 7 日指标摘要",
      sourceType: "metric-summary",
      sourceId: diagnosis.creator.id,
      excerpt: `7 日播放 ${compact(metrics.views7d)}，播放变化 ${signedPct(metrics.viewsChangePct)}，完播率 ${pct(
        metrics.completionRate
      )}，互动率 ${pct(metrics.interactionRate)}，转粉率 ${pct(metrics.followerConversionRate)}。`
    },
    {
      id: "ev-history",
      label: "近 7 日趋势",
      sourceType: "metric-history",
      sourceId: diagnosis.creator.id,
      excerpt: diagnosis.metrics.history
        .slice(-3)
        .map((point) => `${point.date}: 播放 ${compact(point.views)} / 完播 ${pct(point.completionRate)}`)
        .join("；")
    },
    ...(topContent
      ? [
          {
            id: "ev-top-content",
            label: "高表现内容样本",
            sourceType: "top-content" as const,
            sourceId: topContent.id,
            excerpt: `「${topContent.title}」播放 ${compact(topContent.views)}，hook：${topContent.hook}，机会：${topContent.opportunity}。`
          }
        ]
      : []),
    ...(priorityInsight
      ? [
          {
            id: "ev-priority-insight",
            label: priorityInsight.title,
            sourceType: "insight" as const,
            sourceId: priorityInsight.id,
            moduleId: priorityInsight.moduleId,
            excerpt: `${priorityInsight.summary} 证据：${priorityInsight.evidence.join("；")}。`
          }
        ]
      : []),
    {
      id: "ev-active-modules",
      label: "已加载 AI 模块",
      sourceType: "ai-module",
      sourceId: diagnosis.creator.id,
      excerpt: context.modules.map((module) => `${module.name}(${module.id})`).join("、")
    }
  ];
};

const createFacts = (diagnosis: DiagnosisResponse, context: ActiveContext): AgentFact[] => {
  const metrics = diagnosis.metrics.summary;
  const priorityInsight = pickPriorityInsight(context.insights);
  const topContent = diagnosis.metrics.topContents[0];

  return [
    {
      id: "fact-profile",
      statement: `${diagnosis.creator.displayName} 当前目标集中在 ${diagnosis.creator.goals.join("、")}。`,
      confidence: "high",
      evidenceIds: ["ev-profile"]
    },
    {
      id: "fact-performance",
      statement: `近 7 日播放为 ${compact(metrics.views7d)}，较前期 ${signedPct(metrics.viewsChangePct)}，完播率为 ${pct(metrics.completionRate)}。`,
      confidence: "high",
      evidenceIds: ["ev-summary", "ev-history"]
    },
    ...(priorityInsight
      ? [
          {
            id: "fact-priority",
            statement: `当前优先级最高的问题是「${priorityInsight.title}」。`,
            confidence: "high" as const,
            evidenceIds: ["ev-priority-insight", "ev-active-modules"]
          }
        ]
      : []),
    ...(topContent
      ? [
          {
            id: "fact-top-content",
            statement: `当前最值得复用的样本是「${topContent.title}」。`,
            confidence: "medium" as const,
            evidenceIds: ["ev-top-content"]
          }
        ]
      : [])
  ];
};

const createAssumptions = (diagnosis: DiagnosisResponse, context: ActiveContext): AgentAssumption[] => {
  const priorityInsight = pickPriorityInsight(context.insights);
  const firstBottleneck = diagnosis.creator.bottlenecks[0];

  return [
    ...(priorityInsight
      ? [
          {
            id: "assumption-focus",
            statement: `如果只优化一个方向，优先处理「${priorityInsight.title}」比平均解释所有指标更可能带来可观察变化。`,
            confidence: "medium" as const,
            evidenceIds: ["ev-priority-insight"],
            risk: "如果样本量太小或近期有外部活动，优先级需要在下一轮数据中复核。"
          }
        ]
      : []),
    ...(firstBottleneck
      ? [
          {
            id: "assumption-bottleneck",
            statement: `画像中的瓶颈「${firstBottleneck}」可能仍在影响本周表现。`,
            confidence: "medium" as const,
            evidenceIds: ["ev-profile", "ev-summary"]
          }
        ]
      : [])
  ];
};

const createActions = (context: ActiveContext): AgentAction[] => {
  const timeframes = ["today", "tomorrow", "this_week"] as const;

  return context.insights
    .flatMap((insight) =>
      insight.actions.map((action) => ({
        insight,
        action
      }))
    )
    .slice(0, 3)
    .map(({ insight, action }, index) => ({
      id: `action-${index + 1}`,
      label: action.label,
      detail: action.detail,
      effort: action.effort,
      timeframe: timeframes[index] ?? "this_week",
      status: "suggested",
      evidenceIds: ["ev-priority-insight", "ev-active-modules"],
      metricToWatch: insight.metricLabel
    }));
};

const createDeterministicAnswer = (diagnosis: DiagnosisResponse, context: ActiveContext, messages: AgentMessage[]) => {
  const latest = messages.at(-1)?.content ?? "";
  const priorityInsight = pickPriorityInsight(context.insights);
  const topContent = diagnosis.metrics.topContents[0];
  const moduleNames = context.modules.map((module) => module.name).join("、");

  if (includesAny(latest, ["选题", "拍什么", "下一条", "内容"])) {
    return [
      `我会把下一步收敛到一个内容实验：围绕「${diagnosis.creator.domain}」做 3 条同主题变体。`,
      topContent
        ? `最该复用的样本是「${topContent.title}」，它的 hook 是「${topContent.hook}」。`
        : "目前高表现样本不足，先用教程、避坑、清单三种结构做小样本测试。",
      priorityInsight ? `同时要避开当前主要问题「${priorityInsight.title}」：${priorityInsight.summary}` : "",
      `本次调用模块：${moduleNames}。`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (includesAny(latest, ["为什么", "下降", "不好", "原因", "波动"])) {
    return [
      priorityInsight
        ? `主要矛盾先看「${priorityInsight.title}」：${priorityInsight.summary}`
        : "目前没有明显红灯，更适合继续扩大样本并观察趋势。",
      priorityInsight ? `数据依据：${priorityInsight.evidence.join("；")}。` : "",
      priorityInsight ? `建议今天先做：${priorityInsight.actions[0]?.detail ?? "保留变量，做一轮小样本实验。"}` : "",
      `本次调用模块：${moduleNames}。`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (includesAny(latest, ["复盘", "今天", "本周", "行动", "计划"])) {
    const actions = createActions(context);

    return [
      `我会把行动压成 ${actions.length} 件事，避免建议过散。`,
      ...actions.map((action) => `- ${action.label}：${action.detail}`),
      `复盘时重点看：${actions.map((action) => action.metricToWatch).filter(Boolean).join("、") || "播放、完播、互动、转粉"}。`
    ].join("\n");
  }

  return [
    `我已基于「${diagnosis.creator.displayName}」的画像、近 7 日指标和 ${context.modules.length} 个 AI 模块完成诊断。`,
    priorityInsight
      ? `当前最该优先处理的是「${priorityInsight.title}」：${priorityInsight.summary}`
      : "当前没有明显异常，可以继续把高表现内容结构沉淀成系列化模板。",
    `回答中我会区分数据事实、AI 推测和可执行动作。本次调用模块：${moduleNames}。`
  ].join("\n\n");
};

export const createStructuredAgentRun = ({
  diagnosis,
  messages,
  activeModules = [],
  llmAnswer,
  kernelResponses = [],
  kernelToolCalls,
  now = new Date()
}: DataAgentInput): AgentRun => {
  const context = filterActiveContext(diagnosis, activeModules);
  const evidence = [...createEvidence(diagnosis, context), ...createKernelEvidence(kernelResponses)];
  const facts = createFacts(diagnosis, context);
  const assumptions = createAssumptions(diagnosis, context);
  const actions = createActions(context);
  const toolId = createIdFactory("tool");
  const evidenceIds = evidence.map((item) => item.id);
  const answer = llmAnswer?.trim() || createDeterministicAnswer(diagnosis, context, messages);

  const toolCalls: AgentToolCall[] = [
    createToolCall(
      toolId(),
      "load_creator_context",
      `读取创作者 ${diagnosis.creator.id} 的画像、指标和内容样本。`,
      `已加载 ${diagnosis.metrics.history.length} 天趋势、${diagnosis.metrics.topContents.length} 条高表现内容。`,
      ["ev-profile", "ev-summary", "ev-history"]
    ),
    createToolCall(
      toolId(),
      "select_ai_modules",
      activeModules.length > 0 ? `限定模块：${activeModules.join("、")}` : "使用服务端为该创作者动态匹配的模块。",
      `实际使用 ${context.modules.length} 个模块：${context.modules.map((module) => module.name).join("、")}。`,
      ["ev-active-modules"]
    ),
    createToolCall(
      toolId(),
      "rank_priority_insight",
      "按 severity 与模块诊断结果选择最高优先级问题。",
      pickPriorityInsight(context.insights)?.title ?? "没有明显优先级异常。",
      ["ev-priority-insight"]
    ),
    createToolCall(
      toolId(),
      "synthesize_action_plan",
      "把 insight actions 压缩为今天到本周的行动建议。",
      actions.length > 0 ? `生成 ${actions.length} 条建议。` : "暂无可执行建议。",
      evidenceIds
    ),
    {
      id: toolId(),
      name: "llm_synthesis",
      status: llmAnswer ? "success" : "skipped",
      inputSummary: "根据工具结果生成面向创作者的自然语言回答。",
      outputSummary: llmAnswer ? "已使用外部 LLM 生成最终回答。" : "未配置或未使用 LLM，采用确定性 fallback 回答。",
      evidenceIds
    },
    ...(kernelToolCalls ??
      kernelResponses.map((response, index) =>
        createKernelToolCall(response, index)
      ))
  ];

  return {
    id: `run-${now.getTime()}`,
    mode: llmAnswer ? "llm-assisted" : "deterministic",
    answer,
    usedModules: context.modules.map((module) => module.id),
    toolCalls,
    evidence,
    facts,
    assumptions,
    actions,
    followUpQuestions: [
      "把这些建议整理成今天的执行清单",
      "解释每条建议对应的数据证据",
      "下一轮复盘应该看哪些指标"
    ],
    createdAt: now.toISOString()
  };
};
