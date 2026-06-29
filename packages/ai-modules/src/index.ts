import type {
  AiModuleMetadata,
  CreatorMetrics,
  CreatorProfile,
  CreatorType,
  Insight,
  ModuleLoadMode,
} from "@creator/data-contracts";

export type AiModuleInput = {
  profile: CreatorProfile;
  metrics: CreatorMetrics;
  moduleLoadMode?: ModuleLoadMode;
};

export type AiModule = AiModuleMetadata & {
  supportedCreatorTypes?: CreatorType[];
  match: (input: AiModuleInput) => boolean;
  run: (input: AiModuleInput) => Insight;
  adaptiveScore: (input: AiModuleInput) => number;
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
const money = (value: number | undefined) =>
  `${(value ?? 0).toLocaleString("zh-CN")} 元`;
const includesBottleneck = (profile: CreatorProfile, keywords: string[]) =>
  profile.bottlenecks.some((item) =>
    keywords.some((keyword) => item.includes(keyword)),
  );

const focusedModuleIdsByCreatorType: Record<CreatorType, string[]> = {
  short_drama_strategy: [
    "drama-revenue-radar",
    "viral-review",
    "content-diagnosis",
    "fan-operation",
  ],
  personal_daily_diagnosis: [
    "traffic-anomaly",
    "content-diagnosis",
    "tag-risk-explainer",
    "publishing-cadence",
  ],
  growth_review: [
    "viral-review",
    "fan-operation",
    "content-diagnosis",
    "traffic-anomaly",
  ],
  plateau_repair: [
    "plateau-experiment",
    "traffic-anomaly",
    "content-diagnosis",
    "publishing-cadence",
  ],
  series_operation: [
    "series-operation",
    "fan-operation",
    "viral-review",
    "publishing-cadence",
  ],
};

export const aiModules: AiModule[] = [
  {
    id: "content-diagnosis",
    name: "内容表现诊断",
    description: "判断播放、完播和互动的主要矛盾，给出下一条内容的改法。",
    renderer: "insight-card",
    chart: {
      style: "funnel-conversion",
      title: "播放到粉丝承接漏斗",
      description: "把播放、有效完播、互动和新增粉丝串成一条内容兑现链路。",
      metricKeys: [
        "views",
        "completionRate",
        "interactionRate",
        "followersGained",
      ],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["内容", "完播", "互动"],
    requiredData: ["summary", "history", "topContents"],
    match: () => true,
    adaptiveScore: ({ metrics }) =>
      60 +
      (metrics.summary.completionRate < 0.45 ? 24 : 8) +
      Math.max(0, -metrics.summary.viewsChangePct),
    run: ({ metrics }) => {
      const best = metrics.topContents[0];

      return {
        id: "insight-content-diagnosis",
        moduleId: "content-diagnosis",
        title:
          metrics.summary.completionRate < 0.45
            ? "先修前 5 秒留存"
            : "复制高完播内容结构",
        summary:
          metrics.summary.completionRate < 0.45
            ? "近期完播率仍是增长瓶颈，首帧需要更早兑现标题承诺。"
            : "完播表现已经超过账号当前阶段均线，可以把高表现结构沉淀成固定栏目。",
        severity:
          metrics.summary.completionRate < 0.45 ? "warning" : "positive",
        evidence: [
          `7 日完播率 ${pct(metrics.summary.completionRate)}`,
          best
            ? `高表现内容「${best.title}」的 hook 是：${best.hook}`
            : "暂无高表现内容样本",
          `播放变化 ${signed(metrics.summary.viewsChangePct)}`,
        ],
        actions: [
          {
            label: "重写前 3 秒",
            detail: "首帧直接展示结果、冲突或收益，再进入过程解释。",
            effort: "low",
          },
          {
            label: "沉淀内容模板",
            detail: best
              ? `把「${best.title}」拆成可复用标题、首帧和结尾结构。`
              : "选择最近最高完播内容拆结构。",
            effort: "medium",
          },
        ],
        metricLabel: "完播率",
        metricValue: pct(metrics.summary.completionRate),
      };
    },
  },
  {
    id: "drama-revenue-radar",
    name: "短剧收益/题材雷达",
    description: "把近 1-2 周流水、题材热度和高表现内容转译成选题判断。",
    renderer: "trend-chart",
    chart: {
      style: "dual-axis-trend",
      title: "流水与转化趋势",
      description: "对照流水和转化率，判断题材热度是否真的带来收益。",
      metricKeys: ["liveGmv", "commerceConversionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["短剧", "流水", "题材"],
    requiredData: ["liveGmv", "commerceConversionRate", "topContents"],
    supportedCreatorTypes: ["short_drama_strategy"],
    match: ({ profile, metrics }) =>
      profile.creatorType === "short_drama_strategy" ||
      typeof metrics.summary.liveGmv7d === "number",
    adaptiveScore: ({ profile, metrics }) =>
      (profile.creatorType === "short_drama_strategy" ? 92 : 52) +
      (metrics.summary.viewsChangePct > 0 ? 8 : 0),
    run: ({ metrics }) => ({
      id: "insight-drama-revenue-radar",
      moduleId: "drama-revenue-radar",
      title: "把流水抬升题材放进下一轮选题会",
      summary:
        "当前更值得看近两周题材和收益的同步变化，而不是只复盘播放最高的单条内容。",
      severity: "notice",
      evidence: [
        `7 日流水 ${money(metrics.summary.liveGmv7d)}`,
        `收益转化率 ${pct(metrics.summary.commerceConversionRate ?? 0)}`,
        `高表现题材机会：${metrics.topContents[0]?.opportunity ?? "暂无"}`,
      ],
      actions: [
        {
          label: "整理 3 个高流水题材",
          detail: "选题会前按题材、冲突类型、结尾付费钩子整理近两周表现。",
          effort: "medium",
        },
        {
          label: "做同题材变体",
          detail: "保留收益最高内容的核心冲突，替换人物关系和开场悬念做 A/B。",
          effort: "medium",
        },
      ],
      metricLabel: "7 日流水",
      metricValue: money(metrics.summary.liveGmv7d),
    }),
  },
  {
    id: "traffic-anomaly",
    name: "流量异常解释",
    description: "把播放下滑、完播掉点和受众偏移解释成普通创作者能理解的原因。",
    renderer: "chat-brief",
    chart: {
      style: "heatmap-calendar",
      title: "流量异常信号矩阵",
      description: "把播放、完播、互动和转粉放进同一热力矩阵，定位同步掉点。",
      metricKeys: [
        "views",
        "completionRate",
        "interactionRate",
        "followerConversionRate",
      ],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["异常", "原因", "受众"],
    requiredData: ["summary", "history", "profile"],
    supportedCreatorTypes: [
      "personal_daily_diagnosis",
      "growth_review",
      "plateau_repair",
    ],
    match: ({ profile, metrics }) =>
      profile.creatorType === "personal_daily_diagnosis" ||
      profile.creatorType === "growth_review" ||
      profile.creatorType === "plateau_repair" ||
      metrics.summary.viewsChangePct < -8 ||
      includesBottleneck(profile, ["流量", "限流", "异常", "标签"]),
    adaptiveScore: ({ profile, metrics }) =>
      50 +
      Math.max(0, -metrics.summary.viewsChangePct) +
      (profile.creatorType === "personal_daily_diagnosis" ? 24 : 0),
    run: ({ profile, metrics }) => ({
      id: "insight-traffic-anomaly",
      moduleId: "traffic-anomaly",
      title:
        metrics.summary.viewsChangePct < 0
          ? "先解释播放下滑的具体断点"
          : "把流量波动拆成可排查原因",
      summary:
        "不要只判断是不是限流，先看首帧停留、完播、互动和标签受众是否同步变化。",
      severity: metrics.summary.viewsChangePct < -15 ? "warning" : "notice",
      evidence: [
        `7 日播放变化 ${signed(metrics.summary.viewsChangePct)}`,
        `完播率 ${pct(metrics.summary.completionRate)}`,
        `关键困扰：${profile.bottlenecks[0] ?? "暂无"}`,
      ],
      actions: [
        {
          label: "按三层排查异常",
          detail:
            "先看首帧和完播，再看互动，最后看标签/受众变化，避免直接归因限流。",
          effort: "low",
        },
        {
          label: "复刻一条低变量内容",
          detail: "保留同一拍摄场景和主题，只换开头 3 秒，观察完播是否回升。",
          effort: "medium",
        },
      ],
      metricLabel: "播放变化",
      metricValue: signed(metrics.summary.viewsChangePct),
    }),
  },
  {
    id: "viral-review",
    name: "爆款复盘",
    description:
      "拆解高表现内容的标题、开头、结构和评论触发点，沉淀可复制动作。",
    renderer: "action-plan",
    chart: {
      style: "radar-score",
      title: "爆款可复制能力雷达",
      description: "用播放增长、完播、互动和转粉衡量爆款结构能否复用。",
      metricKeys: [
        "views",
        "completionRate",
        "interactionRate",
        "followerConversionRate",
      ],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["爆款", "复盘", "复制"],
    requiredData: ["topContents", "summary"],
    supportedCreatorTypes: [
      "short_drama_strategy",
      "growth_review",
      "series_operation",
    ],
    match: ({ profile }) =>
      ["short_drama_strategy", "growth_review", "series_operation"].includes(
        profile.creatorType,
      ) || profile.goals.includes("increase_views"),
    adaptiveScore: ({ profile, metrics }) =>
      48 +
      (metrics.summary.completionRate >= 0.48 ? 18 : 0) +
      (profile.creatorType === "growth_review" ? 24 : 0),
    run: ({ profile, metrics }) => {
      const best = metrics.topContents[0];
      const audience = profile.audience[0]?.label ?? "核心受众";

      return {
        id: "insight-viral-review",
        moduleId: "viral-review",
        title: "把高表现内容拆成下一轮模板",
        summary: `${profile.domain}适合围绕「${audience}」复用已验证的 hook 和评论触发点，而不是重新发散方向。`,
        severity: "notice",
        evidence: [
          best
            ? `样本「${best.title}」播放 ${best.views.toLocaleString("zh-CN")}`
            : "暂无高表现内容样本",
          best ? `Hook：${best.hook}` : "暂无 hook",
          best ? `机会：${best.opportunity}` : "暂无机会点",
        ],
        actions: [
          {
            label: "复刻标题结构",
            detail: best
              ? `保留「${best.title}」的问题/冲突结构，替换场景或人群。`
              : "选择最近最高播放内容复刻标题结构。",
            effort: "low",
          },
          {
            label: "把评论变成下一条",
            detail: "挑一条高赞评论做回复视频，用评论截图或问题原文开场。",
            effort: "medium",
          },
        ],
        metricLabel: "复盘样本",
        metricValue: best ? "1 条" : "0 条",
      };
    },
  },
  {
    id: "fan-operation",
    name: "粉丝经营诊断",
    description: "识别转粉、老粉互动和评论运营机会。",
    renderer: "chat-brief",
    chart: {
      style: "dual-axis-trend",
      title: "新增粉丝与转粉率",
      description: "用新增粉丝量和转粉率判断播放是否被有效承接。",
      metricKeys: ["followersGained", "followerConversionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["粉丝", "转粉", "评论"],
    requiredData: ["summary", "audience"],
    supportedCreatorTypes: [
      "short_drama_strategy",
      "growth_review",
      "plateau_repair",
      "series_operation",
    ],
    match: ({ profile, metrics }) =>
      profile.goals.includes("grow_followers") ||
      metrics.summary.followerConversionRate < 0.006 ||
      includesBottleneck(profile, ["转粉", "老粉", "评论"]),
    adaptiveScore: ({ profile, metrics }) =>
      52 +
      (metrics.summary.followerConversionRate < 0.006 ? 20 : 6) +
      (profile.creatorType === "series_operation" ? 16 : 0),
    run: ({ profile, metrics }) => ({
      id: "insight-fan-operation",
      moduleId: "fan-operation",
      title:
        metrics.summary.followerConversionRate < 0.006
          ? "播放没有充分转成粉丝"
          : "粉丝承接可以进一步放大",
      summary: "建议把结尾关注理由、主页合集和评论回访做成一套承接链路。",
      severity:
        metrics.summary.followerConversionRate < 0.006 ? "warning" : "notice",
      evidence: [
        `7 日转粉率 ${pct(metrics.summary.followerConversionRate)}`,
        `新增粉丝 ${metrics.summary.followerGain7d.toLocaleString("zh-CN")}`,
        `主要受众：${profile.audience.map((item) => item.label).join("、")}`,
      ],
      actions: [
        {
          label: "补一个关注理由",
          detail: `结尾用一句话说明关注后能持续获得什么，例如「持续更新${profile.domain}判断」。`,
          effort: "low",
        },
        {
          label: "评论区做二次选题",
          detail: "置顶一个开放问题，第二天用高赞评论做回复视频。",
          effort: "medium",
        },
      ],
      metricLabel: "转粉率",
      metricValue: pct(metrics.summary.followerConversionRate),
    }),
  },
  {
    id: "plateau-experiment",
    name: "瓶颈实验计划",
    description: "面向持续下滑账号，生成定位、选题和结构的低变量实验路径。",
    renderer: "action-plan",
    chart: {
      style: "heatmap-calendar",
      title: "瓶颈修复信号矩阵",
      description: "用播放、完播和转粉冷热观察修复实验是否出现回暖信号。",
      metricKeys: ["views", "completionRate", "followerConversionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    },
    tags: ["瓶颈", "实验", "定位"],
    requiredData: ["summary", "history", "topContents"],
    supportedCreatorTypes: ["plateau_repair"],
    match: ({ profile, metrics }) =>
      profile.creatorType === "plateau_repair" ||
      profile.lifecycle === "plateau" ||
      metrics.summary.viewsChangePct < -20,
    adaptiveScore: ({ profile, metrics }) =>
      50 +
      Math.max(0, -metrics.summary.viewsChangePct) +
      (profile.creatorType === "plateau_repair" ? 48 : 0),
    run: ({ profile, metrics }) => ({
      id: "insight-plateau-experiment",
      moduleId: "plateau-experiment",
      title: "用低变量实验修复持续下滑",
      summary:
        "先不要大幅换赛道，用同主题不同开头、同开头不同人群、同人群不同收益点做 7 天实验。",
      severity: metrics.summary.viewsChangePct < -20 ? "warning" : "notice",
      evidence: [
        `播放变化 ${signed(metrics.summary.viewsChangePct)}`,
        `7 日发布 ${metrics.summary.publishCount7d} 条`,
        `定位困扰：${profile.bottlenecks.join("；")}`,
      ],
      actions: [
        {
          label: "设计三组低变量实验",
          detail:
            "每组只改一个变量：开头、人群或收益点，其他拍摄方式保持一致。",
          effort: "medium",
        },
        {
          label: "暂停重复弱题材",
          detail: "把近 7 天低完播内容先归档，避免继续复制已经失效的结构。",
          effort: "low",
        },
      ],
      metricLabel: "播放变化",
      metricValue: signed(metrics.summary.viewsChangePct),
    }),
  },
  {
    id: "series-operation",
    name: "系列合集运营",
    description: "诊断系列规划、追更承接和评论二次选题机会。",
    renderer: "insight-card",
    chart: {
      style: "heatmap-calendar",
      title: "系列播放热度",
      description:
        "用近 7 天播放冷热观察系列内容反馈，真实发布节奏需接入每日发布字段。",
      metricKeys: ["views"],
      unit: "count",
      timeRangeDays: 7,
    },
    tags: ["系列", "合集", "追更"],
    requiredData: ["profile", "summary", "topContents"],
    supportedCreatorTypes: ["series_operation"],
    match: ({ profile }) =>
      profile.creatorType === "series_operation" ||
      profile.contentFormats.includes("series") ||
      includesBottleneck(profile, ["系列", "合集", "追更"]),
    adaptiveScore: ({ profile, metrics }) =>
      48 +
      (profile.creatorType === "series_operation" ? 32 : 0) +
      (metrics.summary.interactionRate >= 0.06 ? 12 : 0),
    run: ({ metrics }) => ({
      id: "insight-series-operation",
      moduleId: "series-operation",
      title: "把老粉评论沉淀成下一期选题",
      summary:
        "系列内容的关键不是多发，而是让合集、评论和下一期预告形成追更理由。",
      severity: "notice",
      evidence: [
        `互动率 ${pct(metrics.summary.interactionRate)}`,
        `近 7 天发布 ${metrics.summary.publishCount7d} 条`,
        `高表现机会：${metrics.topContents[0]?.opportunity ?? "暂无"}`,
      ],
      actions: [
        {
          label: "固定下一期预告",
          detail: "每条结尾明确下一期主题，并引导评论投票决定顺序。",
          effort: "low",
        },
        {
          label: "用评论开场",
          detail: "每周至少一条用老粉评论截图开场，强化追更参与感。",
          effort: "medium",
        },
      ],
      metricLabel: "互动率",
      metricValue: pct(metrics.summary.interactionRate),
    }),
  },
  {
    id: "tag-risk-explainer",
    name: "标签/违规风险解释",
    description: "解释标签偏移、非原创疑虑和疑似限流风险，避免创作者盲目猜测。",
    renderer: "chat-brief",
    tags: ["标签", "违规", "限流"],
    requiredData: ["profile", "topContents"],
    supportedCreatorTypes: ["personal_daily_diagnosis"],
    match: ({ profile }) =>
      profile.creatorType === "personal_daily_diagnosis" ||
      includesBottleneck(profile, ["标签", "违规", "限流", "非原创", "BGM"]),
    adaptiveScore: ({ profile }) =>
      46 + (profile.creatorType === "personal_daily_diagnosis" ? 30 : 0),
    run: ({ profile, metrics }) => ({
      id: "insight-tag-risk-explainer",
      moduleId: "tag-risk-explainer",
      title: "先区分标签偏移和内容风险",
      summary:
        "播放变低不一定等于限流，需要把 BGM、画面相似度、标签受众和首帧表现分开看。",
      severity: "notice",
      evidence: [
        `相关困扰：${profile.bottlenecks.filter((item) => /标签|违规|限流|非原创|BGM/.test(item)).join("；") || profile.bottlenecks[0]}`,
        `最近低表现样本：${metrics.topContents.at(-1)?.title ?? "暂无"}`,
        `内容形态：${profile.contentFormats.join("、")}`,
      ],
      actions: [
        {
          label: "建立风险排查清单",
          detail:
            "每条异常内容记录 BGM、素材来源、首帧、标签和受众变化，再决定是否申诉或重发。",
          effort: "low",
        },
        {
          label: "做一条原创对照",
          detail: "不用热门模板，只保留同一主题，观察标签和完播是否恢复。",
          effort: "medium",
        },
      ],
      metricLabel: "风险项",
      metricValue: "标签/素材",
    }),
  },
  {
    id: "publishing-cadence",
    name: "发布节奏建议",
    description: "根据发布频次和波动判断是否需要稳定更新节奏。",
    renderer: "insight-card",
    chart: {
      style: "heatmap-calendar",
      title: "播放波动热力",
      description:
        "用近 7 天播放反馈提示内容节奏是否稳定，真实发布时间需接入每日发布字段。",
      metricKeys: ["views"],
      unit: "count",
      timeRangeDays: 7,
    },
    tags: ["发布", "节奏", "稳定性"],
    requiredData: ["summary", "history"],
    supportedCreatorTypes: [
      "personal_daily_diagnosis",
      "plateau_repair",
      "series_operation",
    ],
    match: ({ profile, metrics }) =>
      profile.goals.includes("stabilize_output") ||
      metrics.summary.publishCount7d < 5,
    adaptiveScore: ({ metrics }) =>
      44 + (metrics.summary.publishCount7d < 5 ? 18 : 0),
    run: ({ metrics }) => ({
      id: "insight-publishing-cadence",
      moduleId: "publishing-cadence",
      title: "先把发布节奏变成可预测资产",
      summary:
        "稳定发布能减少复盘变量，让系统更快判断到底是选题、开头还是受众出了问题。",
      severity: metrics.summary.publishCount7d < 4 ? "warning" : "notice",
      evidence: [
        `近 7 天发布 ${metrics.summary.publishCount7d} 条`,
        `播放最高日 ${Math.max(...metrics.history.map((item) => item.views)).toLocaleString("zh-CN")}`,
        `播放最低日 ${Math.min(...metrics.history.map((item) => item.views)).toLocaleString("zh-CN")}`,
      ],
      actions: [
        {
          label: "固定两个发布窗口",
          detail: "连续 2 周只测试两个发布时间，减少变量。",
          effort: "low",
        },
        {
          label: "建立复盘表",
          detail:
            "每条内容记录选题、开头、发布时间、完播和转粉，不先引入更多变量。",
          effort: "medium",
        },
      ],
      metricLabel: "7 日发布",
      metricValue: `${metrics.summary.publishCount7d} 条`,
    }),
  },
];

const moduleById = new Map(aiModules.map((module) => [module.id, module]));

const selectFocusedModules = (input: AiModuleInput) => {
  const preferredIds = focusedModuleIdsByCreatorType[input.profile.creatorType];
  const preferredModules = preferredIds
    .map((id) => moduleById.get(id))
    .filter((module): module is AiModule => {
      if (!module) {
        return false;
      }

      return module.match(input);
    });

  if (preferredModules.length > 0) {
    return preferredModules;
  }

  return aiModules.filter((module) => module.match(input)).slice(0, 4);
};

const selectAdaptiveModules = (input: AiModuleInput) =>
  aiModules
    .filter((module) => module.match(input))
    .map((module) => ({ module, score: module.adaptiveScore(input) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ module }) => module);

export const selectAiModules = (input: AiModuleInput) => {
  const moduleLoadMode = input.moduleLoadMode ?? "focused";

  if (moduleLoadMode === "complete") {
    return aiModules.filter((module) => module.match(input));
  }

  if (moduleLoadMode === "adaptive") {
    return selectAdaptiveModules(input);
  }

  return selectFocusedModules(input);
};

export const runAiModules = (input: AiModuleInput) =>
  selectAiModules(input).map((module) => module.run(input));

export const toModuleMetadata = (module: AiModule): AiModuleMetadata => ({
  id: module.id,
  name: module.name,
  description: module.description,
  renderer: module.renderer,
  chart: module.chart,
  tags: module.tags,
  requiredData: module.requiredData,
});

export const createDiagnosis = (input: AiModuleInput) => {
  const moduleLoadMode = input.moduleLoadMode ?? "focused";
  const modules = selectAiModules({ ...input, moduleLoadMode });

  return {
    creator: input.profile,
    metrics: input.metrics,
    moduleLoadMode,
    modules: modules.map(toModuleMetadata),
    insights: modules.map((module) => module.run(input)),
  };
};
