import type {
  AiModuleMetadata,
  CreatorMetrics,
  CreatorProfile,
  Insight
} from "@creator/data-contracts";

export type AiModuleInput = {
  profile: CreatorProfile;
  metrics: CreatorMetrics;
};

export type AiModule = AiModuleMetadata & {
  match: (input: AiModuleInput) => boolean;
  run: (input: AiModuleInput) => Insight;
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;

export const aiModules: AiModule[] = [
  {
    id: "content-diagnosis",
    name: "内容表现诊断",
    description: "判断播放、完播和互动的主要矛盾，给出下一条内容的改法。",
    renderer: "insight-card",
    tags: ["内容", "完播", "互动"],
    requiredData: ["summary", "history", "topContents"],
    match: () => true,
    run: ({ metrics }) => {
      const best = metrics.topContents[0];

      return {
        id: "insight-content-diagnosis",
        moduleId: "content-diagnosis",
        title: metrics.summary.completionRate < 0.45 ? "先修前 5 秒留存" : "复制高完播内容结构",
        summary:
          metrics.summary.completionRate < 0.45
            ? "近期完播率仍是增长瓶颈，首帧需要更早兑现标题承诺。"
            : "完播表现已经超过账号当前阶段均线，可以把爆款结构沉淀成固定栏目。",
        severity: metrics.summary.completionRate < 0.45 ? "warning" : "positive",
        evidence: [
          `7 日完播率 ${pct(metrics.summary.completionRate)}`,
          best ? `高表现内容「${best.title}」的 hook 是：${best.hook}` : "暂无高表现内容样本",
          `播放变化 ${signed(metrics.summary.viewsChangePct)}`
        ],
        actions: [
          {
            label: "重写前 3 秒",
            detail: "首帧直接展示结果、冲突或收益，再进入过程解释。",
            effort: "low"
          },
          {
            label: "沉淀栏目模板",
            detail: best ? `把「${best.title}」拆成可复用标题和镜头结构。` : "选择最近最高完播内容拆结构。",
            effort: "medium"
          }
        ],
        metricLabel: "完播率",
        metricValue: pct(metrics.summary.completionRate)
      };
    }
  },
  {
    id: "topic-opportunity",
    name: "选题机会雷达",
    description: "根据创作者领域、受众和高表现内容生成下一组可实验选题。",
    renderer: "action-plan",
    tags: ["选题", "实验", "增长"],
    requiredData: ["profile", "topContents"],
    match: ({ profile }) => profile.goals.includes("increase_views") || profile.lifecycle === "new",
    run: ({ profile, metrics }) => {
      const audience = profile.audience[0]?.label ?? "核心受众";
      const topOpportunity = metrics.topContents[0]?.opportunity ?? "把表现最好的内容做成系列";

      return {
        id: "insight-topic-opportunity",
        moduleId: "topic-opportunity",
        title: "用 3 条内容验证一个系列方向",
        summary: `${profile.domain}账号适合先围绕「${audience}」做轻量选题实验，不要一次性铺太多方向。`,
        severity: "notice",
        evidence: [
          `当前领域：${profile.domain}`,
          `核心受众：${audience}`,
          `已有机会：${topOpportunity}`
        ],
        actions: [
          {
            label: "做三条同主题变体",
            detail: "同一个痛点分别用教程、避坑、清单三种结构测试。",
            effort: "medium"
          },
          {
            label: "统一系列名",
            detail: "让封面、标题开头和主页合集都出现同一个系列记忆点。",
            effort: "low"
          }
        ],
        metricLabel: "实验周期",
        metricValue: "7 天"
      };
    }
  },
  {
    id: "fan-operation",
    name: "粉丝经营诊断",
    description: "识别转粉、老粉互动和评论运营机会。",
    renderer: "chat-brief",
    tags: ["粉丝", "转粉", "评论"],
    requiredData: ["summary", "audience"],
    match: ({ profile, metrics }) =>
      profile.goals.includes("grow_followers") ||
      metrics.summary.followerConversionRate < 0.006 ||
      profile.bottlenecks.some((item) => item.includes("转粉") || item.includes("老粉")),
    run: ({ profile, metrics }) => ({
      id: "insight-fan-operation",
      moduleId: "fan-operation",
      title: metrics.summary.followerConversionRate < 0.006 ? "播放没有充分转成粉丝" : "粉丝承接可以进一步放大",
      summary: "建议把结尾关注理由、主页合集和评论回访做成一套承接链路。",
      severity: metrics.summary.followerConversionRate < 0.006 ? "warning" : "notice",
      evidence: [
        `7 日转粉率 ${pct(metrics.summary.followerConversionRate)}`,
        `新增粉丝 ${metrics.summary.followerGain7d.toLocaleString("zh-CN")}`,
        `主要受众：${profile.audience.map((item) => item.label).join("、")}`
      ],
      actions: [
        {
          label: "补一个关注理由",
          detail: `结尾用一句话说明关注后能持续获得什么，例如「每天一个${profile.domain}实用判断」。`,
          effort: "low"
        },
        {
          label: "评论区做二次选题",
          detail: "置顶一个开放问题，第二天用高赞评论做回复视频。",
          effort: "medium"
        }
      ],
      metricLabel: "转粉率",
      metricValue: pct(metrics.summary.followerConversionRate)
    })
  },
  {
    id: "commerce-optimizer",
    name: "商业化承接优化",
    description: "面向直播、电商和商单场景，诊断内容到成交的承接链路。",
    renderer: "trend-chart",
    tags: ["电商", "直播", "转化"],
    requiredData: ["commerceConversionRate", "liveGmv", "topContents"],
    match: ({ profile, metrics }) =>
      profile.contentFormats.includes("commerce") ||
      profile.contentFormats.includes("live") ||
      typeof metrics.summary.liveGmv7d === "number",
    run: ({ metrics }) => ({
      id: "insight-commerce-optimizer",
      moduleId: "commerce-optimizer",
      title: "把种草内容和直播货架对齐",
      summary: "短视频已经能带来兴趣，下一步要减少用户从内容到直播间的选择成本。",
      severity: "notice",
      evidence: [
        `7 日 GMV ${metrics.summary.liveGmv7d?.toLocaleString("zh-CN") ?? "暂无"} 元`,
        `商品转化率 ${pct(metrics.summary.commerceConversionRate ?? 0)}`,
        `高表现内容机会：${metrics.topContents[0]?.opportunity ?? "暂无"}`
      ],
      actions: [
        {
          label: "直播货架命名跟随内容",
          detail: "把短视频里的清单/场景词同步到直播间分组名称。",
          effort: "low"
        },
        {
          label: "设置 3 个讲解节点",
          detail: "开场讲场景，中段讲参数，临近福利节点讲真实使用反馈。",
          effort: "medium"
        }
      ],
      metricLabel: "商品转化率",
      metricValue: pct(metrics.summary.commerceConversionRate ?? 0)
    })
  },
  {
    id: "publishing-cadence",
    name: "发布节奏建议",
    description: "根据发布频次和波动判断是否需要稳定更新节奏。",
    renderer: "insight-card",
    tags: ["发布", "节奏", "稳定性"],
    requiredData: ["summary", "history"],
    match: ({ profile, metrics }) =>
      profile.goals.includes("stabilize_output") || metrics.summary.publishCount7d < 5,
    run: ({ metrics }) => ({
      id: "insight-publishing-cadence",
      moduleId: "publishing-cadence",
      title: "先把发布节奏变成可预测资产",
      summary: "账号还在学习期，稳定发布比一次性追求大爆款更能积累判断样本。",
      severity: metrics.summary.publishCount7d < 4 ? "warning" : "notice",
      evidence: [
        `近 7 天发布 ${metrics.summary.publishCount7d} 条`,
        `播放最高日 ${Math.max(...metrics.history.map((item) => item.views)).toLocaleString("zh-CN")}`,
        `播放最低日 ${Math.min(...metrics.history.map((item) => item.views)).toLocaleString("zh-CN")}`
      ],
      actions: [
        {
          label: "固定两个发布窗口",
          detail: "连续 2 周只测试两个发布时间，减少变量。",
          effort: "low"
        },
        {
          label: "建立复盘表",
          detail: "每条内容记录选题、开头、发布时间、完播和转粉，不先引入更多变量。",
          effort: "medium"
        }
      ],
      metricLabel: "7 日发布",
      metricValue: `${metrics.summary.publishCount7d} 条`
    })
  }
];

export const selectAiModules = (input: AiModuleInput) => aiModules.filter((module) => module.match(input));

export const runAiModules = (input: AiModuleInput) => selectAiModules(input).map((module) => module.run(input));

export const toModuleMetadata = (module: AiModule): AiModuleMetadata => ({
  id: module.id,
  name: module.name,
  description: module.description,
  renderer: module.renderer,
  tags: module.tags,
  requiredData: module.requiredData
});

export const createDiagnosis = (input: AiModuleInput) => {
  const modules = selectAiModules(input);

  return {
    creator: input.profile,
    metrics: input.metrics,
    modules: modules.map(toModuleMetadata),
    insights: modules.map((module) => module.run(input))
  };
};
