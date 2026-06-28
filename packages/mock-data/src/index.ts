import type { CreatorMetrics, CreatorProfile } from "@creator/data-contracts";

export type MockCreator = {
  profile: CreatorProfile;
  metrics: CreatorMetrics;
};

const createHistory = (
  views: number[],
  completionRates: number[],
  interactionRates: number[],
  followerConversionRates: number[],
  followersGained: number[],
  commerceConversionRates?: number[],
  liveGmv?: number[]
) =>
  views.map((viewCount, index) => ({
    date: `2026-06-${String(21 + index).padStart(2, "0")}`,
    views: viewCount,
    completionRate: completionRates[index] ?? completionRates.at(-1) ?? 0,
    interactionRate: interactionRates[index] ?? interactionRates.at(-1) ?? 0,
    followerConversionRate: followerConversionRates[index] ?? followerConversionRates.at(-1) ?? 0,
    followersGained: followersGained[index] ?? followersGained.at(-1) ?? 0,
    commerceConversionRate: commerceConversionRates?.[index],
    liveGmv: liveGmv?.[index]
  }));

export const mockCreators: MockCreator[] = [
  {
    profile: {
      id: "short-drama-strategy",
      handle: "@短剧热度研究室",
      displayName: "短剧热度研究室",
      domain: "短剧制作/选题",
      creatorType: "short_drama_strategy",
      lifecycle: "commercial",
      contentFormats: ["short_video", "series", "commerce"],
      goals: ["increase_views", "increase_conversion", "improve_interaction"],
      bottlenecks: ["流水数据回看不够及时", "题材热度需要更细分", "选题会前缺少近 1-2 周市场信号"],
      audience: [
        { label: "短剧付费用户", percentage: 44, note: "偏好强冲突、快节奏反转和明确爽点" },
        { label: "题材尝鲜用户", percentage: 31, note: "对近期热梗和同类爆款高度敏感" },
        { label: "团队选题成员", percentage: 25, note: "关注题材占比、流水变化和复盘证据" }
      ],
      creatorHabits: ["团队小会定选题", "人工刷剧判断市场风向", "重点看昨日和近两周流水"],
      tone: "直接、商业判断明确、强调趋势和收益证据"
    },
    metrics: {
      summary: {
        views7d: 1286000,
        viewsChangePct: 18,
        completionRate: 0.46,
        interactionRate: 0.057,
        followerGain7d: 5180,
        followerConversionRate: 0.004,
        publishCount7d: 9,
        liveGmv7d: 486000,
        commerceConversionRate: 0.042
      },
      history: createHistory(
        [142000, 168000, 151000, 189000, 211000, 205000, 220000],
        [0.43, 0.44, 0.42, 0.46, 0.48, 0.47, 0.49],
        [0.051, 0.053, 0.049, 0.056, 0.061, 0.059, 0.063],
        [0.0035, 0.0037, 0.0034, 0.004, 0.0044, 0.0043, 0.0046],
        [497, 622, 514, 756, 928, 882, 981],
        [0.034, 0.037, 0.035, 0.041, 0.045, 0.043, 0.047],
        [52000, 61000, 57000, 72000, 83000, 78000, 83000]
      ),
      topContents: [
        {
          id: "sd1",
          title: "换亲当天，她反手拿回继承权",
          views: 318000,
          completionRate: 0.52,
          interactionRate: 0.071,
          followerConversionRate: 0.0048,
          hook: "前 2 秒抛出身份反转和利益冲突",
          opportunity: "近两周强反转女主题材流水抬升，可拆成三条同题材变体"
        },
        {
          id: "sd2",
          title: "豪门试婚 7 天，男主终于露出破绽",
          views: 264000,
          completionRate: 0.48,
          interactionRate: 0.062,
          followerConversionRate: 0.0041,
          hook: "直接给出试婚倒计时和悬念",
          opportunity: "试婚/契约关系讨论高，但结尾付费钩子需要更早铺垫"
        }
      ]
    }
  },
  {
    profile: {
      id: "personal-daily-diagnosis",
      handle: "@小鹿今天也营业",
      displayName: "小鹿今天也营业",
      domain: "个人日常/自拍视频",
      creatorType: "personal_daily_diagnosis",
      lifecycle: "new",
      contentFormats: ["short_video"],
      goals: ["increase_views", "improve_interaction", "stabilize_output"],
      bottlenecks: ["流量异常时不知道原因", "标签和受众变化看不懂", "换 BGM 后担心被限流或非原创"],
      audience: [
        { label: "颜值向浏览用户", percentage: 39, note: "停留受首帧和音乐卡点影响大" },
        { label: "同城年轻用户", percentage: 33, note: "评论更关注地点、穿搭和生活状态" },
        { label: "老粉轻互动用户", percentage: 28, note: "会收藏合集，但很少主动转粉" }
      ],
      creatorHabits: ["流量异常才打开后台", "会整理合集和粉丝画像", "喜欢用热门 BGM 和卡点模板"],
      tone: "低门槛、解释清楚、给下一条能照做的动作"
    },
    metrics: {
      summary: {
        views7d: 146000,
        viewsChangePct: -28,
        completionRate: 0.36,
        interactionRate: 0.039,
        followerGain7d: 760,
        followerConversionRate: 0.0052,
        publishCount7d: 5
      },
      history: createHistory(
        [31000, 26000, 22000, 19000, 17000, 16000, 15000],
        [0.41, 0.39, 0.37, 0.35, 0.34, 0.33, 0.32],
        [0.047, 0.043, 0.041, 0.037, 0.036, 0.035, 0.034],
        [0.006, 0.0058, 0.0054, 0.005, 0.0048, 0.0047, 0.0045],
        [186, 151, 119, 95, 82, 68, 59]
      ),
      topContents: [
        {
          id: "pd1",
          title: "下雨天也要出门拍一支卡点",
          views: 42000,
          completionRate: 0.44,
          interactionRate: 0.052,
          followerConversionRate: 0.0064,
          hook: "首帧出现雨伞和转场动作",
          opportunity: "雨天场景和卡点动作有效，下一条可保留场景但更早展示人物正脸"
        },
        {
          id: "pd2",
          title: "换了新 BGM 后播放突然变低",
          views: 23000,
          completionRate: 0.31,
          interactionRate: 0.033,
          followerConversionRate: 0.0042,
          hook: "开头先铺垫心情，没有直接展示变化",
          opportunity: "需要检查标签偏移和音乐模板相似度，避免只凭感觉判断限流"
        }
      ]
    }
  },
  {
    profile: {
      id: "growth-review",
      handle: "@商业增长笔记",
      displayName: "商业增长笔记",
      domain: "职场知识/方法论",
      creatorType: "growth_review",
      lifecycle: "growing",
      contentFormats: ["short_video", "image_text", "series"],
      goals: ["grow_followers", "improve_interaction", "increase_views"],
      bottlenecks: ["播放稳定但转粉下降", "爆款与日常内容差距大", "评论深度高但互动回访弱"],
      audience: [
        { label: "运营/产品从业者", percentage: 46, note: "偏好案例拆解和方法论模板" },
        { label: "创业者", percentage: 27, note: "关注增长模型和商业判断" },
        { label: "学生转行人群", percentage: 27, note: "喜欢清单式入门内容" }
      ],
      creatorHabits: ["复盘意识强", "常做长系列", "偏好数据和案例论证"],
      tone: "理性、结构化、有商业判断"
    },
    metrics: {
      summary: {
        views7d: 732000,
        viewsChangePct: -8,
        completionRate: 0.51,
        interactionRate: 0.074,
        followerGain7d: 4060,
        followerConversionRate: 0.0055,
        publishCount7d: 6
      },
      history: createHistory(
        [126000, 112000, 98000, 87000, 96000, 104000, 109000],
        [0.54, 0.52, 0.49, 0.48, 0.51, 0.52, 0.53],
        [0.081, 0.076, 0.069, 0.071, 0.073, 0.074, 0.076],
        [0.0069, 0.0061, 0.005, 0.0049, 0.0052, 0.0055, 0.0056],
        [870, 683, 486, 427, 499, 548, 547]
      ),
      topContents: [
        {
          id: "gr1",
          title: "为什么你的用户增长永远停在第一波？",
          views: 186000,
          completionRate: 0.58,
          interactionRate: 0.086,
          followerConversionRate: 0.0062,
          hook: "尖锐问题开场，评论讨论多",
          opportunity: "结尾增加系列订阅理由，提升转粉"
        },
        {
          id: "gr2",
          title: "一张图看懂留存、复购和推荐",
          views: 141000,
          completionRate: 0.55,
          interactionRate: 0.079,
          followerConversionRate: 0.0059,
          hook: "图文结构利于收藏",
          opportunity: "评论区引导用户提交行业案例"
        }
      ]
    }
  },
  {
    profile: {
      id: "plateau-repair",
      handle: "@阿南健身实验室",
      displayName: "阿南健身实验室",
      domain: "健身教学/账号修复",
      creatorType: "plateau_repair",
      lifecycle: "plateau",
      contentFormats: ["short_video", "series"],
      goals: ["increase_views", "grow_followers", "stabilize_output"],
      bottlenecks: ["连续三周播放下滑", "老选题重复导致新粉增长慢", "账号定位在教程和测评之间摇摆"],
      audience: [
        { label: "新手减脂人群", percentage: 41, note: "需要简单动作和可见结果" },
        { label: "健身进阶用户", percentage: 34, note: "关注动作细节和训练计划" },
        { label: "老粉打卡用户", percentage: 25, note: "习惯评论打卡，但分享率下降" }
      ],
      creatorHabits: ["同一套动作反复讲", "标题模板固定", "复盘时只看播放高低"],
      tone: "问题拆解明确、鼓励小步实验、避免一次推翻账号定位"
    },
    metrics: {
      summary: {
        views7d: 268000,
        viewsChangePct: -34,
        completionRate: 0.4,
        interactionRate: 0.046,
        followerGain7d: 980,
        followerConversionRate: 0.0037,
        publishCount7d: 4
      },
      history: createHistory(
        [52000, 44000, 41000, 36000, 34000, 32000, 29000],
        [0.45, 0.43, 0.41, 0.39, 0.38, 0.37, 0.36],
        [0.052, 0.05, 0.047, 0.045, 0.044, 0.043, 0.041],
        [0.0048, 0.0044, 0.004, 0.0037, 0.0036, 0.0034, 0.0032],
        [250, 194, 164, 133, 122, 109, 93]
      ),
      topContents: [
        {
          id: "pr1",
          title: "膝盖不舒服的人先别练深蹲",
          views: 76000,
          completionRate: 0.47,
          interactionRate: 0.058,
          followerConversionRate: 0.0046,
          hook: "直接说错误动作会加重疼痛",
          opportunity: "痛点警示比标准教程更有效，可测试避坑系列"
        },
        {
          id: "pr2",
          title: "7 天核心训练计划第 3 天",
          views: 39000,
          completionRate: 0.36,
          interactionRate: 0.039,
          followerConversionRate: 0.0031,
          hook: "系列编号清楚但收益感弱",
          opportunity: "系列内容需要补充阶段成果展示，避免只像打卡记录"
        }
      ]
    }
  },
  {
    profile: {
      id: "series-operation",
      handle: "@城市夜跑地图",
      displayName: "城市夜跑地图",
      domain: "城市生活/系列合集",
      creatorType: "series_operation",
      lifecycle: "stable",
      contentFormats: ["short_video", "series"],
      goals: ["grow_followers", "improve_interaction", "stabilize_output"],
      bottlenecks: ["合集追更率不稳定", "老粉评论多但新粉承接弱", "评论问题没有沉淀成下一期选题"],
      audience: [
        { label: "城市跑步新手", percentage: 43, note: "收藏路线和装备清单" },
        { label: "同城夜跑用户", percentage: 35, note: "关注安全、灯光和补给点" },
        { label: "老粉路线党", percentage: 22, note: "会追更合集并提出路线建议" }
      ],
      creatorHabits: ["按路线做合集", "评论里收集下一站", "周末集中剪辑"],
      tone: "陪伴感强、重视老粉反馈、适合做系列化运营"
    },
    metrics: {
      summary: {
        views7d: 356000,
        viewsChangePct: 9,
        completionRate: 0.49,
        interactionRate: 0.068,
        followerGain7d: 2140,
        followerConversionRate: 0.006,
        publishCount7d: 5
      },
      history: createHistory(
        [41000, 46000, 48000, 51000, 54000, 56000, 60000],
        [0.45, 0.47, 0.48, 0.49, 0.5, 0.5, 0.51],
        [0.061, 0.064, 0.066, 0.067, 0.069, 0.07, 0.071],
        [0.0052, 0.0055, 0.0057, 0.006, 0.0061, 0.0062, 0.0063],
        [214, 253, 274, 306, 329, 347, 378]
      ),
      topContents: [
        {
          id: "so1",
          title: "第 12 条夜跑路线：江边 5 公里",
          views: 82000,
          completionRate: 0.55,
          interactionRate: 0.078,
          followerConversionRate: 0.0072,
          hook: "首帧直接展示路线地图和夜景",
          opportunity: "地图首帧和路线编号有效，可把评论里的安全问题做下一期"
        },
        {
          id: "so2",
          title: "老粉推荐的三条补给点",
          views: 69000,
          completionRate: 0.52,
          interactionRate: 0.074,
          followerConversionRate: 0.0068,
          hook: "用评论截图作为开头证据",
          opportunity: "评论驱动内容提升老粉参与，可固定为每周回访栏目"
        }
      ]
    }
  }
];

export const creatorIds = mockCreators.map(({ profile }) => profile.id);

export const getMockCreator = (creatorId: string): MockCreator => {
  const match = mockCreators.find(({ profile }) => profile.id === creatorId);

  if (match) {
    return match;
  }

  const fallback = mockCreators[0];

  if (!fallback) {
    throw new Error("No mock creators are configured.");
  }

  return fallback;
};
