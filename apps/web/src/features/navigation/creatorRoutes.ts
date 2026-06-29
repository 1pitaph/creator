import type { DashboardPanel } from "../../types";

export const creatorRouteDefinitions = {
  overview: {
    label: "首页",
    path: "overview",
    panel: "overview",
  },
  activity: {
    label: "活动管理",
    path: "activity",
    panel: "board",
  },
  contentWorks: {
    label: "作品管理",
    path: "content/works",
    status: "coming-soon",
  },
  contentCollections: {
    label: "合集管理",
    path: "content/collections",
    status: "coming-soon",
  },
  contentCoCreation: {
    label: "共创中心",
    path: "content/co-creation",
    status: "coming-soon",
  },
  contentOriginalProtection: {
    label: "原创保护中心",
    path: "content/original-protection",
    status: "coming-soon",
  },
  interactionFollows: {
    label: "关注管理",
    path: "interaction/follows",
    status: "coming-soon",
  },
  interactionFans: {
    label: "粉丝管理",
    path: "interaction/fans",
    status: "coming-soon",
  },
  interactionComments: {
    label: "评论管理",
    path: "interaction/comments",
    status: "coming-soon",
  },
  interactionDanmaku: {
    label: "弹幕管理",
    path: "interaction/danmaku",
    status: "coming-soon",
  },
  interactionMessages: {
    label: "私信管理",
    path: "interaction/messages",
    status: "coming-soon",
  },
  dataAccountOverview: {
    label: "账号总览",
    path: "data/account-overview",
    panel: "table",
  },
  dataWorkAnalysis: {
    label: "作品分析",
    path: "data/work-analysis",
    status: "coming-soon",
  },
  dataFanAnalysis: {
    label: "粉丝分析",
    path: "data/fan-analysis",
    status: "coming-soon",
  },
  dataKeyFocus: {
    label: "重点关心",
    path: "data/key-focus",
    status: "coming-soon",
  },
  monetizationMarket: {
    label: "变现广场",
    path: "monetization/market",
    status: "coming-soon",
  },
  monetizationTasks: {
    label: "我的任务",
    path: "monetization/tasks",
    status: "coming-soon",
  },
  monetizationIncome: {
    label: "我的收入",
    path: "monetization/income",
    status: "coming-soon",
  },
  creationInspiration: {
    label: "创作灵感",
    path: "creation/inspiration",
    status: "coming-soon",
  },
  creationLearningCenter: {
    label: "学习中心",
    path: "creation/learning-center",
    status: "coming-soon",
  },
  creationDouyinIndex: {
    label: "抖音指数",
    path: "creation/douyin-index",
    status: "coming-soon",
  },
} as const satisfies Record<
  string,
  {
    label: string;
    path: string;
    panel?: DashboardPanel;
    status?: "coming-soon";
  }
>;

export type CreatorRouteId = keyof typeof creatorRouteDefinitions;

export const defaultCreatorRouteId = "overview" satisfies CreatorRouteId;

export const creatorRouteIds = Object.keys(
  creatorRouteDefinitions,
) as CreatorRouteId[];

const dashboardPanelsByRoute: Partial<Record<CreatorRouteId, DashboardPanel>> = {
  activity: "board",
  dataAccountOverview: "table",
  overview: "overview",
};

export const isCreatorRouteId = (routeId: string): routeId is CreatorRouteId =>
  routeId in creatorRouteDefinitions;

export const getCreatorRoutePath = (
  creatorId: string,
  routeId: CreatorRouteId = defaultCreatorRouteId,
) => {
  const route = creatorRouteDefinitions[routeId];

  return `/creators/${encodeURIComponent(creatorId)}/${route.path}`;
};

export const getDashboardPanelForRoute = (routeId: CreatorRouteId) =>
  dashboardPanelsByRoute[routeId];

export const getCreatorRouteLabel = (routeId: CreatorRouteId) =>
  creatorRouteDefinitions[routeId].label;
