import { createMockAgentReply, type AgentContext } from "@creator/agent-core";
import { createDiagnosis } from "@creator/ai-modules";
import type { AgentMessage, AiModuleMetadata, DiagnosisResponse, Insight, TopContent } from "@creator/data-contracts";
import { getMockCreator, mockCreators } from "@creator/mock-data";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Sparkline, cn } from "@creator/ui";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import { motion } from "motion/react";
import {
  CaretDown,
  ChartBar,
  ChatText,
  CheckCircle,
  CircleNotch,
  Compass,
  List,
  PaperPlaneTilt,
  Play,
  Pulse,
  Robot,
  SidebarSimple,
  Sparkle,
  SquaresFour,
  TrendUp,
  X
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  type ElementType,
  type FormEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type UiMessage = AgentMessage & {
  id: string;
  mode?: "mock" | "llm" | "local";
  usedModules?: string[];
};

type AskTarget = {
  title: string;
  prompt: string;
  moduleId?: string;
  summary?: string;
  evidence?: string[];
};

type MetricDefinition = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "violet";
  trendLabel: string;
  trend: "up" | "down" | "flat";
  values: number[];
  askTarget: AskTarget;
};

const phosphorIconWeight = "duotone" as const;

const lifecycleLabels = {
  new: "新手期",
  growing: "增长期",
  stable: "稳定期",
  plateau: "瓶颈期",
  commercial: "商业化期"
} as const;

const goalLabels = {
  increase_views: "提升播放",
  grow_followers: "涨粉",
  improve_interaction: "提高互动",
  increase_conversion: "提升转化",
  stabilize_output: "稳定更新"
} as const;

const severityTone = {
  positive: "green",
  notice: "blue",
  warning: "amber",
  critical: "red"
} as const;

const toneClass = {
  sky: {
    text: "text-sky-500",
    soft: "bg-sky-50 text-sky-700",
    border: "border-sky-100"
  },
  emerald: {
    text: "text-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100"
  },
  amber: {
    text: "text-amber-500",
    soft: "bg-amber-50 text-amber-700",
    border: "border-amber-100"
  },
  rose: {
    text: "text-rose-500",
    soft: "bg-rose-50 text-rose-700",
    border: "border-rose-100"
  },
  violet: {
    text: "text-violet-500",
    soft: "bg-violet-50 text-violet-700",
    border: "border-violet-100"
  }
} as const;

const creatorOptions = mockCreators.map(({ profile }) => ({
  id: profile.id,
  name: profile.displayName,
  handle: profile.handle,
  domain: profile.domain
}));

const formatCompact = (value: number) =>
  Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);

const formatCurrency = (value: number) =>
  Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "CNY"
  }).format(value);

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const localDiagnosis = (creatorId: string) => {
  const creator = getMockCreator(creatorId);
  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics
  });
};

const fetchDiagnosis = async (creatorId: string) => {
  const response = await fetch(`/api/creator/${creatorId}/diagnosis`);

  if (!response.ok) {
    throw new Error("Diagnosis request failed");
  }

  return (await response.json()) as DiagnosisResponse;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const App = () => {
  const [selectedCreatorId, setSelectedCreatorId] = useState(creatorOptions[0]?.id ?? "starter-food");
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse>(() => localDiagnosis(selectedCreatorId));
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "我会根据当前创作者画像和已加载模块给建议。把鼠标移到任意数据模块右上角，点「询问 AI」就能围绕该模块追问。",
      mode: "local",
      usedModules: []
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [agentFocus, setAgentFocus] = useState<AskTarget | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeModuleIds = useMemo(() => diagnosis.modules.map((module) => module.id), [diagnosis.modules]);

  useEffect(() => {
    let cancelled = false;

    setIsLoadingDiagnosis(true);
    fetchDiagnosis(selectedCreatorId)
      .catch(() => localDiagnosis(selectedCreatorId))
      .then((nextDiagnosis) => {
        if (!cancelled) {
          setDiagnosis(nextDiagnosis);
          setAgentFocus(null);
          setMessages([
            {
              id: `welcome-${selectedCreatorId}`,
              role: "assistant",
              content: `已切换到「${nextDiagnosis.creator.displayName}」。我重新加载了 ${nextDiagnosis.modules.length} 个分析模块，你可以从任意数据卡片唤起我。`,
              mode: "local",
              usedModules: nextDiagnosis.modules.map((module) => module.id)
            }
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDiagnosis(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCreatorId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isAgentOpen]);

  const agentContext: AgentContext = useMemo(
    () => ({
      creator: diagnosis.creator,
      metrics: diagnosis.metrics,
      modules: diagnosis.modules,
      insights: diagnosis.insights
    }),
    [diagnosis]
  );

  const metrics = diagnosis.metrics.summary;
  const topInsight = diagnosis.insights.find((insight) => insight.severity === "warning") ?? diagnosis.insights[0];
  const topContent = diagnosis.metrics.topContents[0];
  const healthScore = clamp(
    Math.round(
      68 +
        metrics.viewsChangePct * 0.22 +
        metrics.completionRate * 22 +
        metrics.interactionRate * 120 +
        metrics.followerConversionRate * 420
    ),
    42,
    96
  );

  const metricCards: MetricDefinition[] = [
    {
      id: "views7d",
      label: "7 日播放",
      value: formatCompact(metrics.views7d),
      helper: `较前期 ${metrics.viewsChangePct > 0 ? "+" : ""}${metrics.viewsChangePct}%`,
      tone: "sky",
      trendLabel: metrics.viewsChangePct > 0 ? "上升" : metrics.viewsChangePct < 0 ? "下降" : "稳定",
      trend: metrics.viewsChangePct > 0 ? "up" : metrics.viewsChangePct < 0 ? "down" : "flat",
      values: diagnosis.metrics.history.map((item) => item.views),
      askTarget: {
        title: "7 日播放",
        moduleId: "content-diagnosis",
        prompt: `请分析「${diagnosis.creator.displayName}」的 7 日播放数据，解释播放变化 ${metrics.viewsChangePct}% 的原因，并给出下一条内容怎么调整。`,
        summary: `7 日播放 ${formatCompact(metrics.views7d)}，较前期 ${metrics.viewsChangePct > 0 ? "+" : ""}${metrics.viewsChangePct}%`,
        evidence: diagnosis.metrics.history.map((item) => `${item.date}: ${formatCompact(item.views)}`).slice(-3)
      }
    },
    {
      id: "completionRate",
      label: "完播率",
      value: formatPct(metrics.completionRate),
      helper: "衡量内容兑现能力",
      tone: "emerald",
      trendLabel: metrics.completionRate >= 0.45 ? "健康" : "待修复",
      trend: metrics.completionRate >= 0.45 ? "up" : "down",
      values: diagnosis.metrics.history.map((item) => item.completionRate),
      askTarget: {
        title: "完播率",
        moduleId: "content-diagnosis",
        prompt: `请只围绕完播率分析「${diagnosis.creator.displayName}」的问题：当前完播率 ${formatPct(metrics.completionRate)}，应该如何优化前 5 秒和内容结构？`,
        summary: `当前完播率 ${formatPct(metrics.completionRate)}`,
        evidence: topContent ? [`高表现内容：${topContent.title}`, `Hook：${topContent.hook}`] : []
      }
    },
    {
      id: "interactionRate",
      label: "互动率",
      value: formatPct(metrics.interactionRate),
      helper: "评论、赞藏、分享综合",
      tone: "amber",
      trendLabel: metrics.interactionRate >= 0.06 ? "活跃" : "可提升",
      trend: metrics.interactionRate >= 0.06 ? "up" : "flat",
      values: diagnosis.metrics.history.map((item) => item.interactionRate),
      askTarget: {
        title: "互动率",
        moduleId: "fan-operation",
        prompt: `请分析互动率模块：当前互动率 ${formatPct(metrics.interactionRate)}，结合受众结构给出评论区和选题互动设计。`,
        summary: `当前互动率 ${formatPct(metrics.interactionRate)}`,
        evidence: diagnosis.creator.audience.map((item) => `${item.label} ${item.percentage}%`)
      }
    },
    {
      id: "followerGain7d",
      label: "7 日涨粉",
      value: formatCompact(metrics.followerGain7d),
      helper: `转粉率 ${formatPct(metrics.followerConversionRate)}`,
      tone: "rose",
      trendLabel: metrics.followerConversionRate >= 0.006 ? "承接中" : "弱承接",
      trend: metrics.followerConversionRate >= 0.006 ? "up" : "down",
      values: diagnosis.metrics.history.map((item) => item.followersGained),
      askTarget: {
        title: "7 日涨粉",
        moduleId: "fan-operation",
        prompt: `请分析「${diagnosis.creator.displayName}」涨粉和转粉承接。当前 7 日涨粉 ${metrics.followerGain7d}，转粉率 ${formatPct(metrics.followerConversionRate)}，怎么提升关注理由？`,
        summary: `7 日涨粉 ${formatCompact(metrics.followerGain7d)}，转粉率 ${formatPct(metrics.followerConversionRate)}`,
        evidence: diagnosis.creator.bottlenecks
      }
    }
  ];

  if (typeof metrics.liveGmv7d === "number" || typeof metrics.commerceConversionRate === "number") {
    metricCards.push({
      id: "commerce",
      label: "商业化承接",
      value: typeof metrics.liveGmv7d === "number" ? formatCurrency(metrics.liveGmv7d) : formatPct(metrics.commerceConversionRate ?? 0),
      helper: `商品转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}`,
      tone: "violet",
      trendLabel: "可优化",
      trend: "up",
      values: diagnosis.metrics.history.map((item) => item.liveGmv ?? item.commerceConversionRate ?? 0),
      askTarget: {
        title: "商业化承接",
        moduleId: "commerce-optimizer",
        prompt: `请分析商业化承接：7 日 GMV ${metrics.liveGmv7d ?? 0}，商品转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}，短视频到直播货架应该怎么对齐？`,
        summary: `GMV ${metrics.liveGmv7d ? formatCurrency(metrics.liveGmv7d) : "暂无"}，商品转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}`,
        evidence: topContent ? [topContent.opportunity] : []
      }
    });
  }

  const addStreamingAssistantMessage = async (reply: string, usedModules: string[], mode: UiMessage["mode"]) => {
    const id = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id,
        role: "assistant",
        content: "",
        usedModules,
        mode
      }
    ]);

    for (let index = 1; index <= reply.length; index += 2) {
      const content = reply.slice(0, index);
      setMessages((current) => current.map((message) => (message.id === id ? { ...message, content } : message)));
      await wait(8);
    }

    setMessages((current) => current.map((message) => (message.id === id ? { ...message, content: reply } : message)));
  };

  const sendQuestion = async (question: string, moduleIds = activeModuleIds) => {
    const text = question.trim();

    if (!text || isChatting) {
      return;
    }

    setIsAgentOpen(true);
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          creatorId: selectedCreatorId,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          activeModules: moduleIds
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const payload = (await response.json()) as {
        reply: string;
        usedModules: string[];
        mode: "mock" | "llm";
      };
      await addStreamingAssistantMessage(payload.reply, payload.usedModules, payload.mode);
    } catch {
      const fallbackContext = {
        ...agentContext,
        modules: agentContext.modules.filter((module) => moduleIds.length === 0 || moduleIds.includes(module.id)),
        insights: agentContext.insights.filter((insight) => moduleIds.length === 0 || moduleIds.includes(insight.moduleId))
      };
      const reply = createMockAgentReply(fallbackContext, nextMessages);
      await addStreamingAssistantMessage(reply, moduleIds.length > 0 ? moduleIds : activeModuleIds, "local");
    } finally {
      setIsChatting(false);
    }
  };

  const handleAskAgent = (target: AskTarget) => {
    setAgentFocus(target);
    void sendQuestion(target.prompt, target.moduleId ? [target.moduleId] : activeModuleIds);
  };

  const askPreset = (question: string) => {
    setAgentFocus({
      title: "自由追问",
      prompt: question,
      summary: "从当前创作者画像、指标面板和已加载 AI 模块中综合回答。"
    });
    setDraft(question);
    setIsAgentOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(draft, agentFocus?.moduleId ? [agentFocus.moduleId] : activeModuleIds);
  };

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <CreatorSidebar
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={setSelectedCreatorId}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
          onOpenAgent={() => setIsAgentOpen(true)}
        />

        <section className="min-w-0 flex-1">
          <header className="sticky top-16 z-30 border-b border-zinc-200/80 bg-[#f5f6f8]/90 px-5 py-4 backdrop-blur md:top-0 xl:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                  <SquaresFour className="h-3.5 w-3.5" weight={phosphorIconWeight} />
                  <span>创作者 AI 数据面板</span>
                  <span>·</span>
                  <span>2026-06-28</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">{diagnosis.creator.displayName} 的增长诊断台</h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={isLoadingDiagnosis ? "amber" : "green"}>
                  {isLoadingDiagnosis ? "正在加载画像" : "Demo 数据已就绪"}
                </Badge>
                <Button type="button" variant="secondary" onClick={() => setIsAgentOpen(true)}>
                  <SidebarSimple className="h-4 w-4" weight={phosphorIconWeight} />
                  AI Agent
                </Button>
              </div>
            </div>
          </header>

          <div className="space-y-5 px-5 py-5 xl:px-7">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DashboardModuleCard
                title="AI 诊断摘要"
                description="基于创作者画像、近 7 日数据和动态模块生成的优先级判断。"
                askTarget={{
                  title: "AI 诊断摘要",
                  prompt: `请总结「${diagnosis.creator.displayName}」当前最重要的增长问题，并按优先级给 3 个动作。`,
                  summary: topInsight?.summary,
                  evidence: topInsight?.evidence
                }}
                onAsk={handleAskAgent}
                className="min-h-[260px]"
              >
                <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_1px_rgba(24,24,27,0.026),0_4px_14px_rgba(24,24,27,0.03)]">
                    <p className="text-xs font-medium text-zinc-500">账号健康度</p>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-6xl font-semibold leading-none text-zinc-950">{healthScore}</span>
                      <span className="pb-2 text-sm font-medium text-zinc-500">/100</span>
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400" style={{ width: `${healthScore}%` }} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-500">综合播放、完播、互动、转粉和模块风险后得到。</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="blue">{diagnosis.creator.domain}</Badge>
                      <Badge tone="neutral">{lifecycleLabels[diagnosis.creator.lifecycle]}</Badge>
                      <Badge tone={topInsight?.severity ? severityTone[topInsight.severity] : "neutral"}>
                        {topInsight?.severity === "warning" ? "需要关注" : "可放大"}
                      </Badge>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-zinc-950">{topInsight?.title ?? "保持稳定实验节奏"}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
                        {topInsight?.summary ?? "当前没有明显异常，可以继续把高表现内容结构沉淀成系列化模板。"}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {diagnosis.creator.goals.slice(0, 3).map((goal) => (
                        <div key={goal} className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]">
                          <p className="text-[11px] font-medium text-zinc-500">当前目标</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{goalLabels[goal]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DashboardModuleCard>

              <DashboardModuleCard
                title="已加载 AI 模块"
                description="模块根据创作者阶段、目标、内容形态和数据阈值动态加载。"
                askTarget={{
                  title: "已加载 AI 模块",
                  prompt: `请解释为什么「${diagnosis.creator.displayName}」当前加载了这些 AI 分析模块，并说明每个模块负责什么。`,
                  summary: `共加载 ${diagnosis.modules.length} 个模块`,
                  evidence: diagnosis.modules.map((module) => module.name)
                }}
                onAsk={handleAskAgent}
              >
                <div className="space-y-3">
                  {diagnosis.modules.map((module) => (
                    <ModuleTile key={module.id} module={module} onAsk={handleAskAgent} />
                  ))}
                </div>
              </DashboardModuleCard>
            </section>

            <section>
              <SectionHeading
                eyebrow="Performance Modules"
                title="核心数据模块"
                description="每张卡片都可以单独唤起 AI Agent，Agent 会带着该模块的上下文回答。"
              />
              <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {metricCards.map((metric) => (
                  <MetricPanel key={metric.id} metric={metric} onAsk={handleAskAgent} />
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <DashboardModuleCard
                title="AI 诊断优先级"
                description="系统根据画像与近 7 日数据选择最该处理的问题。"
                askTarget={{
                  title: "AI 诊断优先级",
                  prompt: `请基于诊断优先级，告诉我「${diagnosis.creator.displayName}」今天应该先做哪一件事，为什么？`,
                  summary: topInsight?.summary,
                  evidence: topInsight?.evidence
                }}
                onAsk={handleAskAgent}
              >
                <div className="space-y-3">
                  {diagnosis.insights.map((insight) => (
                    <InsightRow
                      key={insight.id}
                      insight={insight}
                      module={diagnosis.modules.find((item) => item.id === insight.moduleId)}
                      onAsk={handleAskAgent}
                    />
                  ))}
                </div>
              </DashboardModuleCard>

              <DashboardModuleCard
                title="高表现内容样本"
                description="Agent 会优先参考这些样本生成下一条内容结构。"
                askTarget={{
                  title: "高表现内容样本",
                  prompt: `请基于高表现内容样本，为「${diagnosis.creator.displayName}」提炼可复用的标题、开头和结尾模板。`,
                  summary: topContent?.title,
                  evidence: diagnosis.metrics.topContents.map((item) => item.opportunity)
                }}
                onAsk={handleAskAgent}
              >
                <div className="space-y-3">
                  {diagnosis.metrics.topContents.map((content) => (
                    <TopContentTile key={content.id} content={content} onAsk={handleAskAgent} />
                  ))}
                </div>
              </DashboardModuleCard>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DashboardModuleCard
                title="7 日趋势对照"
                description="把播放、完播、互动和转粉放在同一块面板里观察波动。"
                askTarget={{
                  title: "7 日趋势对照",
                  prompt: `请结合 7 日趋势，找出「${diagnosis.creator.displayName}」波动最大的指标，并给一个排查顺序。`,
                  summary: "播放、完播、互动、转粉趋势对照",
                  evidence: diagnosis.metrics.history.map((item) => `${item.date} 播放 ${formatCompact(item.views)}`)
                }}
                onAsk={handleAskAgent}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {metricCards.slice(0, 4).map((metric) => (
                    <TrendStrip key={metric.id} metric={metric} />
                  ))}
                </div>
              </DashboardModuleCard>

              <DashboardModuleCard
                title="下一步行动队列"
                description="把诊断动作压缩成今天能执行的运营清单。"
                askTarget={{
                  title: "下一步行动队列",
                  prompt: `请把当前所有诊断动作整理成「今天、明天、本周」三个时间段的行动清单。`,
                  summary: "根据所有 insight actions 汇总",
                  evidence: diagnosis.insights.flatMap((insight) => insight.actions.map((action) => action.label))
                }}
                onAsk={handleAskAgent}
              >
                <div className="space-y-3">
                  {diagnosis.insights
                    .flatMap((insight) => insight.actions.map((action) => ({ ...action, moduleId: insight.moduleId, insightTitle: insight.title })))
                    .slice(0, 4)
                    .map((action) => (
                      <div key={`${action.insightTitle}-${action.label}`} className="rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-zinc-950">{action.label}</p>
                          <Badge tone={action.effort === "low" ? "green" : action.effort === "medium" ? "amber" : "red"}>
                            {action.effort}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
                      </div>
                    ))}
                </div>
              </DashboardModuleCard>
            </section>
          </div>
        </section>
      </div>

      <AgentDrawer
        open={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        messages={messages}
        draft={draft}
        isChatting={isChatting}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        onAskPreset={askPreset}
        modules={diagnosis.modules}
        endRef={chatEndRef}
        focus={agentFocus}
      />
    </main>
  );
};

const CreatorSidebar = ({
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onOpenAgent
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onOpenAgent: () => void;
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileSidebar = () => setIsMobileOpen(false);
  const openAgentFromSidebar = () => {
    closeMobileSidebar();
    onOpenAgent();
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-100/95 px-4 backdrop-blur md:hidden">
        <SidebarBrand className="px-0" />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          aria-label="打开侧边栏"
          aria-expanded={isMobileOpen}
          data-testid="mobile-sidebar-trigger"
          onClick={() => setIsMobileOpen(true)}
        >
          <List className="h-5 w-5" weight={phosphorIconWeight} />
        </button>
      </div>

      <aside
        className="sticky top-0 hidden h-screen w-[300px] shrink-0 border-r border-neutral-200 bg-neutral-100 md:flex"
        data-testid="creator-sidebar-desktop"
      >
        <SidebarContent
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
          onOpenAgent={onOpenAgent}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[70] bg-zinc-950/25 transition duration-300 md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isMobileOpen}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileSidebar();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileSidebar();
          }
        }}
      >
        <div
          className={cn(
            "relative z-10 flex h-dvh w-[min(330px,calc(100vw-28px))] transform flex-col border-r border-neutral-200 bg-neutral-100 shadow-2xl transition duration-300",
            isMobileOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
          )}
          data-testid="creator-sidebar-mobile"
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4">
            <SidebarBrand className="px-0" />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
              aria-label="关闭侧边栏"
              onClick={closeMobileSidebar}
            >
              <X className="pointer-events-none h-4 w-4" weight={phosphorIconWeight} />
            </button>
          </div>
          <SidebarContent
            className="min-h-0 flex-1 pt-2"
            showBrand={false}
            selectedCreatorId={selectedCreatorId}
            onSelectCreator={(creatorId) => {
              onSelectCreator(creatorId);
              closeMobileSidebar();
            }}
            diagnosis={diagnosis}
            isLoadingDiagnosis={isLoadingDiagnosis}
            onOpenAgent={openAgentFromSidebar}
            onNavigate={closeMobileSidebar}
          />
        </div>
      </div>
    </>
  );
};

const SidebarContent = ({
  className,
  showBrand = true,
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onOpenAgent,
  onNavigate
}: {
  className?: string;
  showBrand?: boolean;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onOpenAgent: () => void;
  onNavigate?: () => void;
}) => (
  <div className={cn("flex h-full w-full flex-col overflow-hidden px-4 py-4", className)}>
    {showBrand && <SidebarBrand />}

    <ScrollArea.Root className={cn("min-h-0 flex-1", showBrand ? "mt-7" : "mt-0")}>
      <ScrollArea.Viewport className="h-full pr-1">
        <CreatorAccountSelect selectedCreatorId={selectedCreatorId} onSelectCreator={onSelectCreator} />

        <div className="mt-6">
          <SidebarNav onOpenAgent={onOpenAgent} onNavigate={onNavigate} />
        </div>

        <SidebarDivider />

        <CreatorMiniCard diagnosis={diagnosis} />
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-0.5" orientation="vertical">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-300" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>

    <SidebarFooter diagnosis={diagnosis} isLoadingDiagnosis={isLoadingDiagnosis} />
  </div>
);

const SidebarBrand = ({ className }: { className?: string }) => (
  <div className={cn("relative z-20 flex items-center gap-2 px-4 py-1 text-sm text-neutral-950", className)}>
    <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-black text-white">
      <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
    </div>
    <div className="min-w-0">
      <p className="truncate font-medium leading-5 text-neutral-950">Creator AI</p>
      <p className="truncate text-xs leading-4 text-neutral-500">抖音创作者中心 Demo</p>
    </div>
  </div>
);

const CreatorAccountSelect = ({
  selectedCreatorId,
  onSelectCreator
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
}) => (
  <div className="px-1">
    <p className="mb-2 px-3 text-xs font-semibold text-neutral-500">创作者账号</p>
    <Select.Root value={selectedCreatorId} onValueChange={onSelectCreator}>
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm font-medium text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition hover:bg-white focus:ring-2 focus:ring-neutral-300">
        <Select.Value />
        <Select.Icon>
          <CaretDown className="h-4 w-4 text-neutral-500" weight={phosphorIconWeight} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-[90] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
          <Select.Viewport className="p-1">
            {creatorOptions.map((creator) => (
              <Select.Item
                key={creator.id}
                value={creator.id}
                className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-100 data-[state=checked]:font-semibold"
              >
                <Select.ItemText>
                  {creator.name} · {creator.domain}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>
);

const SidebarDivider = () => (
  <div className="my-4 px-4">
    <div className="h-px w-full bg-neutral-200" />
    <div className="h-px w-full bg-white" />
  </div>
);

const CreatorMiniCard = ({ diagnosis }: { diagnosis: DiagnosisResponse }) => (
  <div className="mx-1 rounded-xl border border-neutral-200 bg-white/65 p-3 shadow-[0_1px_1px_rgba(24,24,27,0.03),inset_0_1px_0_rgba(255,255,255,0.85)]">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-950">
        {diagnosis.creator.displayName.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">{diagnosis.creator.displayName}</p>
        <p className="truncate text-xs text-neutral-500">{diagnosis.creator.handle}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      <Badge tone="blue" className="bg-sky-50/80">
        {diagnosis.creator.domain}
      </Badge>
      <Badge tone="neutral" className="bg-neutral-100/80">
        {lifecycleLabels[diagnosis.creator.lifecycle]}
      </Badge>
    </div>
  </div>
);

const SidebarFooter = ({
  diagnosis,
  isLoadingDiagnosis
}: {
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
}) => (
  <div className="mt-4 border-t border-neutral-200 pt-4">
    <div className="group/sidebar flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-neutral-200/80">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
        {diagnosis.creator.displayName.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800 transition duration-150 group-hover/sidebar:translate-x-1">
          {diagnosis.creator.displayName}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {isLoadingDiagnosis ? "画像同步中" : "AI 模块在线"} · {diagnosis.modules.length} tools
        </p>
      </div>
    </div>
  </div>
);

const SidebarNav = ({ onOpenAgent, onNavigate }: { onOpenAgent: () => void; onNavigate?: () => void }) => {
  const items = [
    { label: "诊断总览", icon: SquaresFour, active: true },
    { label: "指标面板", icon: ChartBar },
    { label: "内容样本", icon: Play },
    { label: "AI 模块", icon: Robot },
    { label: "行动队列", icon: Compass }
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarLinkItem
            key={item.label}
            label={item.label}
            active={item.active}
            icon={<Icon className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />}
            onClick={onNavigate}
          />
        );
      })}
      <SidebarLinkItem
        label="AI Agent"
        icon={<ChatText className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />}
        onClick={onOpenAgent}
      />
    </nav>
  );
};

const SidebarLinkItem = ({
  label,
  icon,
  active,
  onClick
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) => {
  const [isIntent, setIsIntent] = useState(false);

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className="group/sidebar relative w-full px-4 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
      onClick={onClick}
      onFocus={() => setIsIntent(true)}
      onBlur={() => setIsIntent(false)}
      onMouseDown={() => setIsIntent(true)}
      onMouseEnter={() => setIsIntent(true)}
      onMouseLeave={() => setIsIntent(false)}
      onPointerEnter={() => setIsIntent(true)}
      onPointerLeave={() => setIsIntent(false)}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-lg bg-neutral-200 transition-opacity duration-150 ease-out",
          active || isIntent ? "opacity-100" : "opacity-0 group-focus/sidebar:opacity-100 group-hover/sidebar:opacity-100"
        )}
      />
      <span className="relative z-20 flex items-center justify-start gap-2 py-2">
        <span className="shrink-0 text-neutral-700 transition-colors duration-150">{icon}</span>
        <span
          className={cn(
            "inline-block whitespace-pre text-sm font-medium transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
            isIntent && "translate-x-1",
            "text-neutral-700"
          )}
        >
          {label}
        </span>
      </span>
    </button>
  );
};

const SectionHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">{eyebrow}</p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  </div>
);

const glowBaseStyle = {
  "--glow-x": "50%",
  "--glow-y": "0%"
} as CSSProperties;

const glowBorderStyle = {
  background:
    "radial-gradient(220px circle at var(--glow-x) var(--glow-y), rgba(24,24,27,0.26), rgba(113,113,122,0.12) 38%, transparent 70%)",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude"
} as CSSProperties;

const glowHaloStyle = {
  background:
    "radial-gradient(280px circle at var(--glow-x) var(--glow-y), rgba(24,24,27,0.08), rgba(113,113,122,0.04) 34%, transparent 68%)"
} as CSSProperties;

const GlowingPanel = ({ className, children }: { className?: string; children: ReactNode }) => {
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      className={cn(
        "group relative isolate rounded-[20px] bg-transparent shadow-[0_1px_1px_rgba(24,24,27,0.025),0_4px_14px_rgba(24,24,27,0.032)] transition duration-300 hover:shadow-[0_1px_2px_rgba(24,24,27,0.05),0_16px_42px_rgba(24,24,27,0.075)]",
        className
      )}
      data-testid="dashboard-module-card"
      onPointerMove={handlePointerMove}
      style={glowBaseStyle}
    >
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[24px] opacity-0 blur-xl transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={glowHaloStyle}
      />
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] p-px opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={glowBorderStyle}
      />
      {children}
    </div>
  );
};

type HoverBorderDirection = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

type HoverBorderGradientProps = PropsWithChildren<
  {
    as?: ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
    type?: "button" | "submit" | "reset";
  } & HTMLAttributes<HTMLElement>
>;

const hoverBorderDirections: HoverBorderDirection[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

const hoverBorderMovingMap: Record<HoverBorderDirection, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  RIGHT: "radial-gradient(16.2% 41.199999999999996% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)"
};

const hoverBorderHighlight = "radial-gradient(75% 181.15942028985506% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)";

const getNextHoverBorderDirection = (currentDirection: HoverBorderDirection, clockwise: boolean) => {
  const currentIndex = hoverBorderDirections.indexOf(currentDirection);
  const nextIndex = clockwise ? (currentIndex - 1 + hoverBorderDirections.length) % hoverBorderDirections.length : (currentIndex + 1) % hoverBorderDirections.length;

  return hoverBorderDirections[nextIndex] ?? "TOP";
};

const HoverBorderGradient = ({ children, containerClassName, className, as: Tag = "button", duration = 1, clockwise = true, onMouseEnter, onMouseLeave, ...props }: HoverBorderGradientProps) => {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<HoverBorderDirection>("TOP");

  useEffect(() => {
    if (hovered) {
      return;
    }

    const interval = window.setInterval(() => {
      setDirection((currentDirection) => getNextHoverBorderDirection(currentDirection, clockwise));
    }, duration * 1000);

    return () => window.clearInterval(interval);
  }, [clockwise, duration, hovered]);

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setHovered(true);
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    setHovered(false);
    onMouseLeave?.(event);
  };

  return (
    <Tag
      className={cn(
        "relative flex h-min w-fit flex-col flex-nowrap content-center items-center justify-center gap-10 overflow-visible rounded-full border bg-black/20 p-px decoration-clone transition duration-500 hover:bg-black/10 dark:bg-white/20",
        containerClassName
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className={cn("z-10 w-auto rounded-[inherit] bg-black px-4 py-2 text-white", className)}>{children}</div>
      <motion.div
        className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{
          filter: "blur(2px)",
          position: "absolute",
          width: "100%",
          height: "100%"
        }}
        initial={{ background: hoverBorderMovingMap[direction] }}
        animate={{
          background: hovered ? [hoverBorderMovingMap[direction], hoverBorderHighlight] : hoverBorderMovingMap[direction]
        }}
        transition={{ ease: "linear", duration }}
      />
      <div className="absolute inset-[2px] z-[1] flex-none rounded-[100px] bg-black" />
    </Tag>
  );
};

const DashboardModuleCard = ({
  title,
  description,
  askTarget,
  onAsk,
  className,
  children
}: {
  title: string;
  description?: string;
  askTarget: AskTarget;
  onAsk: (target: AskTarget) => void;
  className?: string;
  children: ReactNode;
}) => (
  <GlowingPanel className={className}>
    <Card className="relative z-10 h-full overflow-visible rounded-[19px] border-0 bg-white shadow-none">
      <AskAgentToolbar target={askTarget} onAsk={onAsk} />
      <CardHeader className="relative z-10 border-b border-zinc-100/80 !py-5 !pl-6 !pr-28">
        <CardTitle className="text-[15px] font-semibold text-zinc-900">{title}</CardTitle>
        {description && <p className="mt-1.5 text-[13px] leading-5 text-zinc-500">{description}</p>}
      </CardHeader>
      <CardContent className="relative z-10 !px-6 !py-5">{children}</CardContent>
    </Card>
  </GlowingPanel>
);

const AskAgentToolbar = ({ target, onAsk }: { target: AskTarget; onAsk: (target: AskTarget) => void }) => (
  <div
    className="absolute right-3 top-3 z-20 flex translate-y-1 opacity-0 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
    data-testid="ask-agent-toolbar"
  >
    <HoverBorderGradientButton ariaLabel={`询问 AI Agent：${target.title}`} onClick={() => onAsk(target)} />
  </div>
);

const HoverBorderGradientButton = ({ ariaLabel, onClick }: { ariaLabel: string; onClick: () => void }) => (
  <HoverBorderGradient
    containerClassName="rounded-full shadow-[0_10px_26px_rgba(24,24,27,0.10)] hover:shadow-[0_14px_34px_rgba(24,24,27,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
    as="button"
    type="button"
    className="flex items-center space-x-2 bg-white text-black dark:bg-black dark:text-white"
    aria-label={ariaLabel}
    data-testid="ask-agent-primary"
    onClick={onClick}
  >
    <AceternityLogo />
    <span className="whitespace-nowrap">询问 AI</span>
  </HoverBorderGradient>
);

const AceternityLogo = () => (
  <svg width="66" height="65" viewBox="0 0 66 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-black dark:text-white" aria-hidden="true" focusable="false">
    <path
      d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
      stroke="currentColor"
      strokeWidth="15"
      strokeMiterlimit="3.86874"
      strokeLinecap="round"
    />
  </svg>
);

const MetricPanel = ({ metric, onAsk }: { metric: MetricDefinition; onAsk: (target: AskTarget) => void }) => (
  <DashboardModuleCard
    title={metric.label}
    description={metric.helper}
    askTarget={metric.askTarget}
    onAsk={onAsk}
    className="min-h-[214px]"
  >
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-md px-2 py-1 text-xs font-medium", toneClass[metric.tone].soft)}>{metric.trendLabel}</span>
        <TrendUp
          className={cn(
            "h-4 w-4",
            metric.trend === "down" ? "rotate-180 text-zinc-400" : metric.trend === "flat" ? "text-zinc-400" : "text-zinc-500"
          )}
          weight={phosphorIconWeight}
        />
      </div>
      <div className="mt-5">
        <p className="text-4xl font-semibold tracking-normal text-zinc-950">{metric.value}</p>
        <Sparkline className={cn("mt-5 h-14", metric.trend === "down" ? "text-zinc-500" : "text-zinc-900")} values={metric.values} />
      </div>
    </div>
  </DashboardModuleCard>
);

const InsightRow = ({
  insight,
  module,
  onAsk
}: {
  insight: Insight;
  module?: AiModuleMetadata;
  onAsk: (target: AskTarget) => void;
}) => (
  <article className="group/row relative rounded-xl bg-white p-4 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
    <MiniAskButton
      label={insight.title}
      onClick={() =>
        onAsk({
          title: insight.title,
          moduleId: insight.moduleId,
          prompt: `请深入解释「${insight.title}」这个诊断，说明证据、优先级和今天应该怎么执行。`,
          summary: insight.summary,
          evidence: insight.evidence
        })
      }
    />
    <div className="flex items-start justify-between gap-4 pr-10">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={severityTone[insight.severity]}>{module?.name ?? insight.moduleId}</Badge>
          {insight.metricLabel && <span className="text-xs text-zinc-500">{`${insight.metricLabel} ${insight.metricValue ?? ""}`}</span>}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-950">{insight.title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{insight.summary}</p>
      </div>
      <CheckCircle className={cn("h-5 w-5 shrink-0", insight.severity === "warning" ? "text-amber-500" : "text-emerald-500")} weight={phosphorIconWeight} />
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {insight.actions.map((action) => (
        <div key={action.label} className="rounded-lg bg-zinc-50/70 p-3 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.75)]">
          <p className="text-xs font-semibold text-zinc-900">{action.label}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
        </div>
      ))}
    </div>
  </article>
);

const ModuleTile = ({ module, onAsk }: { module: AiModuleMetadata; onAsk: (target: AskTarget) => void }) => {
  const Icon = module.renderer === "trend-chart" ? ChartBar : module.renderer === "action-plan" ? Compass : module.renderer === "chat-brief" ? ChatText : Pulse;

  return (
    <article className="group/row relative rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
      <MiniAskButton
        label={module.name}
        onClick={() =>
          onAsk({
            title: module.name,
            moduleId: module.id,
            prompt: `请解释「${module.name}」模块当前看到了什么，并给我该模块下最值得执行的建议。`,
            summary: module.description,
            evidence: module.tags
          })
        }
      />
      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-800 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.65)]">
          <Icon className="h-4 w-4" weight={phosphorIconWeight} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{module.name}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{module.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {module.tags.map((tag) => (
          <Badge key={tag} tone="neutral">
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  );
};

const TopContentTile = ({ content, onAsk }: { content: TopContent; onAsk: (target: AskTarget) => void }) => (
  <article className="group/row relative rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
    <MiniAskButton
      label={content.title}
      onClick={() =>
        onAsk({
          title: content.title,
          moduleId: "topic-opportunity",
          prompt: `请拆解高表现内容「${content.title}」，提炼它的 hook、标题结构和下一条复用方案。`,
          summary: content.opportunity,
          evidence: [`播放 ${formatCompact(content.views)}`, `完播 ${formatPct(content.completionRate)}`, `转粉 ${formatPct(content.followerConversionRate)}`]
        })
      }
    />
    <div className="pr-10">
      <p className="text-sm font-semibold text-zinc-950">{content.title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="播放" value={formatCompact(content.views)} />
        <Stat label="完播" value={formatPct(content.completionRate)} />
        <Stat label="转粉" value={formatPct(content.followerConversionRate)} />
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{content.opportunity}</p>
    </div>
  </article>
);

const MiniAskButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    className="absolute right-3 top-3 z-10 flex h-8 w-8 translate-y-1 items-center justify-center rounded-lg border border-violet-100 bg-white text-violet-600 opacity-0 shadow-sm transition group-hover/row:translate-y-0 group-hover/row:opacity-100 group-focus-within/row:translate-y-0 group-focus-within/row:opacity-100 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
    aria-label={`询问 AI Agent：${label}`}
    onClick={onClick}
  >
    <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
  </button>
);

const TrendStrip = ({ metric }: { metric: MetricDefinition }) => (
  <div className="rounded-2xl bg-white p-4 shadow-[0_1px_1px_rgba(24,24,27,0.024),0_3px_10px_rgba(24,24,27,0.026)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-zinc-500">{metric.label}</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-950">{metric.value}</p>
      </div>
      <Badge tone={metric.trend === "down" ? "red" : metric.trend === "up" ? "green" : "neutral"}>{metric.trendLabel}</Badge>
    </div>
    <Sparkline className={cn("mt-5 h-16", metric.trend === "down" ? "text-zinc-500" : "text-zinc-900")} values={metric.values} />
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-white px-2 py-2 shadow-[0_1px_1px_rgba(24,24,27,0.02)]">
    <p className="text-[11px] text-zinc-500">{label}</p>
    <p className="mt-1 font-semibold text-zinc-900">{value}</p>
  </div>
);

const AgentDrawer = ({
  open,
  onClose,
  messages,
  draft,
  isChatting,
  onDraftChange,
  onSubmit,
  onAskPreset,
  modules,
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
  modules: AiModuleMetadata[];
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
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
        onClick={onClose}
        aria-label="关闭 AI Agent"
      >
        <X className="h-4 w-4" weight={phosphorIconWeight} />
      </button>
    </CardHeader>

    {focus && (
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
            <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-500">当前询问模块</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{focus.title}</p>
            {focus.summary && <p className="mt-1 text-xs leading-5 text-zinc-600">{focus.summary}</p>}
            {focus.evidence && focus.evidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {focus.evidence.slice(0, 3).map((item) => (
                  <Badge key={item} tone="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="border-b border-zinc-100 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {["为什么最近转粉变低？", "下一条视频拍什么？", "生成 7 天行动计划"].map((question) => (
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
            <ChatBubble key={message.id} message={message} modules={modules} />
          ))}
          {isChatting && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CircleNotch className="h-3.5 w-3.5 animate-spin" weight={phosphorIconWeight} />
              Agent 正在调用分析模块
            </div>
          )}
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

const ChatBubble = ({ message, modules }: { message: UiMessage; modules: AiModuleMetadata[] }) => {
  const isAssistant = message.role === "assistant";
  const usedModuleNames = message.usedModules
    ?.map((moduleId) => modules.find((module) => module.id === moduleId)?.name ?? moduleId)
    .filter(Boolean);

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6",
          isAssistant ? "bg-zinc-100 text-zinc-800" : "bg-zinc-950 text-white"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isAssistant && usedModuleNames && usedModuleNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.mode && <Badge tone={message.mode === "llm" ? "green" : "neutral"}>{message.mode}</Badge>}
            {usedModuleNames.slice(0, 3).map((name) => (
              <Badge key={name} tone="blue">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
