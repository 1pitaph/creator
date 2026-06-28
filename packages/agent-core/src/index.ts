import type {
  AgentMessage,
  AiModuleMetadata,
  CreatorMetrics,
  CreatorProfile,
  Insight
} from "@creator/data-contracts";

export type AgentContext = {
  creator: CreatorProfile;
  metrics: CreatorMetrics;
  modules: AiModuleMetadata[];
  insights: Insight[];
};

export const createAgentSystemPrompt = ({ creator, metrics, modules, insights }: AgentContext) => {
  const activeModules = modules.map((module) => `${module.name}(${module.id})`).join("、");
  const insightLines = insights
    .map((insight) => `- ${insight.title}: ${insight.summary} 证据：${insight.evidence.join("；")}`)
    .join("\n");

  return [
    "你是抖音创作者中心里的 AI 创作运营顾问。",
    "回答必须基于给定创作者画像和 mock 数据，不要假装访问真实抖音内部系统。",
    "优先给 1-3 个可执行动作，解释为什么，并标明用到了哪些分析模块。",
    `创作者：${creator.displayName}，领域：${creator.domain}，阶段：${creator.lifecycle}`,
    `目标：${creator.goals.join("、")}；瓶颈：${creator.bottlenecks.join("、")}`,
    `7 日播放：${metrics.summary.views7d}，播放变化：${metrics.summary.viewsChangePct}%，完播率：${(
      metrics.summary.completionRate * 100
    ).toFixed(1)}%，转粉率：${(metrics.summary.followerConversionRate * 100).toFixed(1)}%`,
    `已加载模块：${activeModules}`,
    "当前诊断：",
    insightLines
  ].join("\n");
};

export const buildChatPayload = (context: AgentContext, messages: AgentMessage[]) => [
  { role: "system" as const, content: createAgentSystemPrompt(context) },
  ...messages.map((message) => ({ role: message.role, content: message.content }))
];

export const createMockAgentReply = (context: AgentContext, messages: AgentMessage[]) => {
  const latest = messages.at(-1)?.content ?? "";
  const priorityInsight = context.insights.find((insight) => insight.severity === "warning") ?? context.insights[0];
  const topContent = context.metrics.topContents[0];
  const moduleNames = context.modules.map((module) => module.name).join("、");

  if (latest.includes("选题") || latest.includes("拍什么")) {
    return [
      `我会优先用「${context.creator.domain}」的受众痛点做一组 7 天实验。`,
      topContent
        ? `参考你现在表现最好的内容「${topContent.title}」，下一组可以复制它的开头方式：${topContent.hook}。`
        : "目前样本还少，先用同一主题做教程、避坑、清单三种结构。",
      "建议今天先产出 3 个标题：一个直接给结果，一个制造反差，一个回答评论区高频问题。",
      `这次判断调用了：${moduleNames}。`
    ].join("\n\n");
  }

  if (latest.includes("为什么") || latest.includes("下降") || latest.includes("不好")) {
    return [
      priorityInsight
        ? `主要矛盾我会先看「${priorityInsight.title}」：${priorityInsight.summary}`
        : "目前没有明显异常，更适合继续扩大有效样本。",
      priorityInsight ? `证据是：${priorityInsight.evidence.join("；")}。` : "",
      priorityInsight ? `下一步：${priorityInsight.actions[0]?.detail ?? "先做一轮小样本实验。"}` : "",
      `这次判断调用了：${moduleNames}。`
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    `我已经按「${context.creator.displayName}」的画像加载了 ${context.modules.length} 个分析模块。`,
    priorityInsight
      ? `当前最该优先处理的是：${priorityInsight.title}。${priorityInsight.summary}`
      : "当前没有明显红灯，可以围绕高表现内容继续做系列化放大。",
    priorityInsight ? `建议动作：${priorityInsight.actions.map((action) => action.label).join("、")}。` : "",
    `这次判断调用了：${moduleNames}。`
  ]
    .filter(Boolean)
    .join("\n\n");
};
