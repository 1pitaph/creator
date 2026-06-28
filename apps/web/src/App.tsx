import { createMockAgentReply, type AgentContext } from "@creator/agent-core";
import { createDiagnosis } from "@creator/ai-modules";
import type { AgentMessage, AiModuleMetadata, DiagnosisResponse, Insight } from "@creator/data-contracts";
import { getMockCreator, mockCreators } from "@creator/mock-data";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, MetricCard, Sparkline, cn } from "@creator/ui";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type UiMessage = AgentMessage & {
  id: string;
  mode?: "mock" | "llm" | "local";
  usedModules?: string[];
};

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

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;

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
      content: "我会根据当前创作者画像和已加载模块给建议。你可以问：为什么最近转粉变低？下一条拍什么？",
      mode: "local",
      usedModules: []
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isChatting, setIsChatting] = useState(false);
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
          setMessages([
            {
              id: `welcome-${selectedCreatorId}`,
              role: "assistant",
              content: `已切换到「${nextDiagnosis.creator.displayName}」。我重新加载了 ${nextDiagnosis.modules.length} 个分析模块，可以直接开始诊断。`,
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
  }, [messages]);

  const agentContext: AgentContext = useMemo(
    () => ({
      creator: diagnosis.creator,
      metrics: diagnosis.metrics,
      modules: diagnosis.modules,
      insights: diagnosis.insights
    }),
    [diagnosis]
  );

  const askPreset = (question: string) => {
    setDraft(question);
  };

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text || isChatting) {
      return;
    }

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
          activeModules: activeModuleIds
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
      const reply = createMockAgentReply(agentContext, nextMessages);
      await addStreamingAssistantMessage(reply, activeModuleIds, "local");
    } finally {
      setIsChatting(false);
    }
  };

  const metrics = diagnosis.metrics.summary;
  const topInsight = diagnosis.insights.find((insight) => insight.severity === "warning") ?? diagnosis.insights[0];

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold">抖音创作者中心 AI Demo</h1>
              <p className="text-xs text-zinc-500">动态分析模块 + 数据聊天 Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={isLoadingDiagnosis ? "amber" : "green"}>
              {isLoadingDiagnosis ? "正在加载画像" : "Demo 数据已就绪"}
            </Badge>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_390px]">
          <CreatorSidebar
            selectedCreatorId={selectedCreatorId}
            onSelectCreator={setSelectedCreatorId}
            diagnosis={diagnosis}
          />

          <section className="min-w-0 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="7 日播放"
                value={formatCompact(metrics.views7d)}
                helper={`较前期 ${metrics.viewsChangePct > 0 ? "+" : ""}${metrics.viewsChangePct}%`}
                trend={metrics.viewsChangePct > 0 ? "up" : metrics.viewsChangePct < 0 ? "down" : "flat"}
              >
                <Sparkline className="mt-3 text-sky-500" values={diagnosis.metrics.history.map((item) => item.views)} />
              </MetricCard>
              <MetricCard label="完播率" value={formatPct(metrics.completionRate)} helper="衡量内容兑现能力">
                <Sparkline
                  className="mt-3 text-emerald-500"
                  values={diagnosis.metrics.history.map((item) => item.completionRate)}
                />
              </MetricCard>
              <MetricCard label="互动率" value={formatPct(metrics.interactionRate)} helper="评论、赞藏、分享综合">
                <Sparkline
                  className="mt-3 text-amber-500"
                  values={diagnosis.metrics.history.map((item) => item.interactionRate)}
                />
              </MetricCard>
              <MetricCard label="7 日涨粉" value={formatCompact(metrics.followerGain7d)} helper={`转粉率 ${formatPct(metrics.followerConversionRate)}`}>
                <Sparkline
                  className="mt-3 text-rose-500"
                  values={diagnosis.metrics.history.map((item) => item.followersGained)}
                />
              </MetricCard>
            </div>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="shadow-panel">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>AI 诊断优先级</CardTitle>
                    <p className="mt-1 text-xs text-zinc-500">系统根据画像与近 7 日数据选择最该处理的问题。</p>
                  </div>
                  <Badge tone={topInsight?.severity ? severityTone[topInsight.severity] : "neutral"}>
                    {topInsight?.severity === "warning" ? "需要关注" : "可放大"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {diagnosis.insights.map((insight) => (
                    <InsightRow key={insight.id} insight={insight} module={diagnosis.modules.find((item) => item.id === insight.moduleId)} />
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-panel">
                <CardHeader>
                  <CardTitle>高表现内容样本</CardTitle>
                  <p className="mt-1 text-xs text-zinc-500">用于给 Agent 生成可复用结构。</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diagnosis.metrics.topContents.map((content) => (
                    <div key={content.id} className="rounded-md border border-zinc-200 p-3">
                      <p className="text-sm font-medium text-zinc-950">{content.title}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Stat label="播放" value={formatCompact(content.views)} />
                        <Stat label="完播" value={formatPct(content.completionRate)} />
                        <Stat label="转粉" value={formatPct(content.followerConversionRate)} />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-zinc-600">{content.opportunity}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <Card className="shadow-panel">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>已加载 AI 模块</CardTitle>
                  <p className="mt-1 text-xs text-zinc-500">不同创作者会触发不同模块组合。</p>
                </div>
                <Badge tone="neutral">{diagnosis.modules.length} 个模块</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {diagnosis.modules.map((module) => (
                  <ModuleTile key={module.id} module={module} />
                ))}
              </CardContent>
            </Card>
          </section>

          <AgentPanel
            messages={messages}
            draft={draft}
            isChatting={isChatting}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            onAskPreset={askPreset}
            modules={diagnosis.modules}
            endRef={chatEndRef}
          />
        </div>
      </div>
    </main>
  );
};

const CreatorSidebar = ({
  selectedCreatorId,
  onSelectCreator,
  diagnosis
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
}) => (
  <aside className="space-y-4">
    <Card className="shadow-panel">
      <CardHeader>
        <CardTitle>创作者画像</CardTitle>
        <p className="mt-1 text-xs text-zinc-500">切换账号可验证千人千面模块加载。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select.Root value={selectedCreatorId} onValueChange={onSelectCreator}>
          <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-300">
            <Select.Value />
            <Select.Icon>
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-50 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              <Select.Viewport className="p-1">
                {creatorOptions.map((creator) => (
                  <Select.Item
                    key={creator.id}
                    value={creator.id}
                    className="flex cursor-pointer items-center rounded px-3 py-2 text-sm outline-none data-[highlighted]:bg-zinc-100"
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

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-sm font-semibold text-zinc-950 shadow-sm">
              {diagnosis.creator.displayName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{diagnosis.creator.displayName}</p>
              <p className="truncate text-xs text-zinc-500">{diagnosis.creator.handle}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="blue">{diagnosis.creator.domain}</Badge>
            <Badge tone="neutral">{lifecycleLabels[diagnosis.creator.lifecycle]}</Badge>
          </div>
        </div>

        <ProfileBlock icon={<Target className="h-4 w-4" />} label="核心目标">
          <div className="flex flex-wrap gap-2">
            {diagnosis.creator.goals.map((goal) => (
              <Badge key={goal} tone="green">
                {goalLabels[goal]}
              </Badge>
            ))}
          </div>
        </ProfileBlock>

        <ProfileBlock icon={<CircleAlert className="h-4 w-4" />} label="当前瓶颈">
          <ul className="space-y-2 text-xs leading-5 text-zinc-600">
            {diagnosis.creator.bottlenecks.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </ProfileBlock>

        <ProfileBlock icon={<Users className="h-4 w-4" />} label="受众结构">
          <div className="space-y-3">
            {diagnosis.creator.audience.map((segment) => (
              <div key={segment.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700">{segment.label}</span>
                  <span className="text-zinc-500">{segment.percentage}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-200">
                  <div className="h-full rounded-full bg-zinc-950" style={{ width: `${segment.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ProfileBlock>
      </CardContent>
    </Card>
  </aside>
);

const ProfileBlock = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
      {icon}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-zinc-50 px-2 py-2">
    <p className="text-[11px] text-zinc-500">{label}</p>
    <p className="mt-1 font-semibold text-zinc-900">{value}</p>
  </div>
);

const InsightRow = ({ insight, module }: { insight: Insight; module?: AiModuleMetadata }) => (
  <article className="rounded-md border border-zinc-200 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={severityTone[insight.severity]}>{module?.name ?? insight.moduleId}</Badge>
          {insight.metricLabel && <span className="text-xs text-zinc-500">{`${insight.metricLabel} ${insight.metricValue ?? ""}`}</span>}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-950">{insight.title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{insight.summary}</p>
      </div>
      <CheckCircle2 className={cn("h-5 w-5 shrink-0", insight.severity === "warning" ? "text-amber-500" : "text-emerald-500")} />
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {insight.actions.map((action) => (
        <div key={action.label} className="rounded-md bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-900">{action.label}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{action.detail}</p>
        </div>
      ))}
    </div>
  </article>
);

const ModuleTile = ({ module }: { module: AiModuleMetadata }) => (
  <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-zinc-800 shadow-sm">
        {module.renderer === "trend-chart" ? <BarChart3 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">{module.name}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{module.description}</p>
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

const AgentPanel = ({
  messages,
  draft,
  isChatting,
  onDraftChange,
  onSubmit,
  onAskPreset,
  modules,
  endRef
}: {
  messages: UiMessage[];
  draft: string;
  isChatting: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAskPreset: (question: string) => void;
  modules: AiModuleMetadata[];
  endRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <Card className="flex min-h-[720px] flex-col shadow-panel xl:h-[calc(100vh-6rem)]">
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <CardTitle>AI 聊天 Agent</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">引用画像、指标和当前模块。</p>
        </div>
      </div>
      <Badge tone="blue">{modules.length} tools</Badge>
    </CardHeader>

    <div className="border-b border-zinc-100 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {["为什么最近转粉变低？", "下一条视频拍什么？", "帮我做一份 7 天行动计划"].map((question) => (
          <Button key={question} type="button" size="sm" variant="ghost" onClick={() => onAskPreset(question)}>
            <MessageSquareText className="h-3.5 w-3.5" />
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
          className="min-h-[74px] flex-1 resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-300"
          placeholder="问问这个账号下一步应该怎么做..."
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <Button type="submit" variant="primary" size="icon" disabled={isChatting || !draft.trim()} aria-label="发送消息">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  </Card>
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
          "max-w-[92%] rounded-lg px-4 py-3 text-sm leading-6",
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
