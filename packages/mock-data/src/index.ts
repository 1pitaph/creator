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
      id: "starter-food",
      handle: "@三分钟家常菜",
      displayName: "三分钟家常菜",
      domain: "美食教程",
      lifecycle: "new",
      contentFormats: ["short_video", "series"],
      goals: ["increase_views", "grow_followers", "stabilize_output"],
      bottlenecks: ["前 3 秒点击后流失高", "主页系列感弱", "更新节奏不稳定"],
      audience: [
        { label: "一线通勤族", percentage: 38, note: "晚间 19:00-22:00 活跃，偏好快手菜" },
        { label: "新手做饭人群", percentage: 32, note: "评论常问食材替换和步骤细节" },
        { label: "家庭用户", percentage: 30, note: "收藏率高，但转粉动作弱" }
      ],
      creatorHabits: ["周末集中拍摄", "标题偏描述型", "常用固定厨房场景"],
      tone: "直接、实用、适合给新手明确步骤"
    },
    metrics: {
      summary: {
        views7d: 184000,
        viewsChangePct: 22,
        completionRate: 0.39,
        interactionRate: 0.048,
        followerGain7d: 1260,
        followerConversionRate: 0.0068,
        publishCount7d: 4
      },
      history: createHistory(
        [19000, 22000, 26000, 21000, 30000, 33000, 33000],
        [0.34, 0.36, 0.37, 0.35, 0.41, 0.42, 0.41],
        [0.039, 0.041, 0.047, 0.043, 0.051, 0.057, 0.058],
        [0.0048, 0.0052, 0.0061, 0.0055, 0.007, 0.0076, 0.0074],
        [92, 114, 159, 121, 224, 281, 269]
      ),
      topContents: [
        {
          id: "v1",
          title: "下班 10 分钟做出番茄肥牛饭",
          views: 68000,
          completionRate: 0.47,
          interactionRate: 0.061,
          followerConversionRate: 0.0084,
          hook: "开头直接展示成品和耗时",
          opportunity: "把系列名固定为「下班十分钟」提高主页承接"
        },
        {
          id: "v2",
          title: "鸡胸肉不柴的 3 个小技巧",
          views: 51000,
          completionRate: 0.42,
          interactionRate: 0.052,
          followerConversionRate: 0.0066,
          hook: "痛点明确但成品出现较晚",
          opportunity: "首帧前置对比效果，增强停留"
        }
      ]
    }
  },
  {
    profile: {
      id: "growth-knowledge",
      handle: "@商业增长笔记",
      displayName: "商业增长笔记",
      domain: "职场知识",
      lifecycle: "growing",
      contentFormats: ["short_video", "image_text", "series"],
      goals: ["grow_followers", "improve_interaction"],
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
          id: "v3",
          title: "为什么你的用户增长永远停在第一波？",
          views: 186000,
          completionRate: 0.58,
          interactionRate: 0.086,
          followerConversionRate: 0.0062,
          hook: "尖锐问题开场，评论讨论多",
          opportunity: "结尾增加系列订阅理由，提升转粉"
        },
        {
          id: "v4",
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
      id: "commerce-live",
      handle: "@轻户外装备局",
      displayName: "轻户外装备局",
      domain: "户外电商/直播",
      lifecycle: "commercial",
      contentFormats: ["short_video", "live", "commerce"],
      goals: ["increase_conversion", "improve_interaction", "grow_followers"],
      bottlenecks: ["短视频种草强但直播承接不稳定", "老粉互动下降", "货品讲解节奏不均"],
      audience: [
        { label: "城市轻户外", percentage: 42, note: "关注颜值、重量和通勤兼容" },
        { label: "入门露营用户", percentage: 34, note: "需要清单和避坑建议" },
        { label: "装备进阶用户", percentage: 24, note: "更看重参数和真实测试" }
      ],
      creatorHabits: ["直播复盘频繁", "内容偏测评", "擅长场景化种草"],
      tone: "专业、可信、带一点生活方式感"
    },
    metrics: {
      summary: {
        views7d: 518000,
        viewsChangePct: 15,
        completionRate: 0.44,
        interactionRate: 0.052,
        followerGain7d: 2380,
        followerConversionRate: 0.0046,
        publishCount7d: 5,
        liveGmv7d: 286000,
        commerceConversionRate: 0.031
      },
      history: createHistory(
        [62000, 71000, 66000, 76000, 83000, 79000, 81000],
        [0.42, 0.43, 0.41, 0.44, 0.46, 0.45, 0.45],
        [0.049, 0.052, 0.047, 0.051, 0.056, 0.055, 0.054],
        [0.0041, 0.0044, 0.004, 0.0045, 0.0051, 0.0049, 0.005],
        [254, 312, 264, 342, 423, 387, 398],
        [0.026, 0.028, 0.027, 0.032, 0.034, 0.033, 0.036],
        [32000, 41000, 35000, 46000, 51000, 42000, 39000]
      ),
      topContents: [
        {
          id: "v5",
          title: "一包搞定周末露营：轻量装备清单",
          views: 124000,
          completionRate: 0.49,
          interactionRate: 0.063,
          followerConversionRate: 0.0054,
          hook: "直接展示完整背包重量",
          opportunity: "直播间设置同名清单货架，提高承接"
        },
        {
          id: "v6",
          title: "雨天徒步鞋到底看哪三个参数？",
          views: 96000,
          completionRate: 0.46,
          interactionRate: 0.058,
          followerConversionRate: 0.0048,
          hook: "参数明确但试穿反馈偏后",
          opportunity: "把真实路面测试提前到前 5 秒"
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
