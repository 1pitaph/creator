import { ChartLineUp } from "@phosphor-icons/react/ChartLineUp";
import { ChatsCircle } from "@phosphor-icons/react/ChatsCircle";
import { Diamond } from "@phosphor-icons/react/Diamond";
import { Flag } from "@phosphor-icons/react/Flag";
import { House } from "@phosphor-icons/react/House";
import { Lightning } from "@phosphor-icons/react/Lightning";
import { Play } from "@phosphor-icons/react/Play";
import type { ReactNode } from "react";

import { PhosphorHoverIcon } from "../../components/ui/PhosphorHoverIcon";
import type { CreatorRouteId } from "../navigation/creatorRoutes";

type SidebarNavChild = {
  id: string;
  label: string;
  routeId: CreatorRouteId;
};

type SidebarNavLeaf = {
  kind: "leaf";
  id: string;
  label: string;
  icon: ReactNode;
  routeId: CreatorRouteId;
  primary?: boolean;
  separated?: boolean;
};

type SidebarNavGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: ReactNode;
  children: SidebarNavChild[];
  defaultOpen?: boolean;
  separated?: boolean;
};

export type SidebarNavItem = SidebarNavLeaf | SidebarNavGroup;

const sidebarIconClassName = "h-6 w-6 shrink-0";

export const sidebarNavItems: SidebarNavItem[] = [
  {
    kind: "leaf",
    id: "home",
    label: "首页",
    icon: <PhosphorHoverIcon className={sidebarIconClassName} icon={House} />,
    routeId: "overview",
    primary: true,
  },
  {
    kind: "leaf",
    id: "activity",
    label: "活动管理",
    icon: <PhosphorHoverIcon className={sidebarIconClassName} icon={Flag} />,
    routeId: "activity",
    separated: true,
  },
  {
    kind: "group",
    id: "content",
    label: "内容管理",
    icon: <PhosphorHoverIcon className={sidebarIconClassName} icon={Play} />,
    children: [
      { id: "works", label: "作品管理", routeId: "contentWorks" },
      { id: "collections", label: "合集管理", routeId: "contentCollections" },
      { id: "co-creation", label: "共创中心", routeId: "contentCoCreation" },
      {
        id: "original-protection",
        label: "原创保护中心",
        routeId: "contentOriginalProtection",
      },
    ],
  },
  {
    kind: "group",
    id: "interaction",
    label: "互动管理",
    icon: (
      <PhosphorHoverIcon className={sidebarIconClassName} icon={ChatsCircle} />
    ),
    children: [
      { id: "follows", label: "关注管理", routeId: "interactionFollows" },
      { id: "fans", label: "粉丝管理", routeId: "interactionFans" },
      { id: "comments", label: "评论管理", routeId: "interactionComments" },
      { id: "danmaku", label: "弹幕管理", routeId: "interactionDanmaku" },
      { id: "messages", label: "私信管理", routeId: "interactionMessages" },
    ],
  },
  {
    kind: "group",
    id: "data",
    label: "数据中心",
    icon: (
      <PhosphorHoverIcon className={sidebarIconClassName} icon={ChartLineUp} />
    ),
    children: [
      {
        id: "account-overview",
        label: "账号总览",
        routeId: "dataAccountOverview",
      },
      { id: "work-analysis", label: "作品分析", routeId: "dataWorkAnalysis" },
      { id: "fan-analysis", label: "粉丝分析", routeId: "dataFanAnalysis" },
      { id: "key-focus", label: "重点关心", routeId: "dataKeyFocus" },
    ],
    separated: true,
  },
  {
    kind: "group",
    id: "monetization",
    label: "变现中心",
    icon: (
      <PhosphorHoverIcon className={sidebarIconClassName} icon={Diamond} />
    ),
    children: [
      {
        id: "monetization-market",
        label: "变现广场",
        routeId: "monetizationMarket",
      },
      { id: "my-tasks", label: "我的任务", routeId: "monetizationTasks" },
      { id: "my-income", label: "我的收入", routeId: "monetizationIncome" },
    ],
    defaultOpen: true,
  },
  {
    kind: "group",
    id: "creation",
    label: "创作中心",
    icon: (
      <PhosphorHoverIcon className={sidebarIconClassName} icon={Lightning} />
    ),
    children: [
      {
        id: "creative-inspiration",
        label: "创作灵感",
        routeId: "creationInspiration",
      },
      {
        id: "learning-center",
        label: "学习中心",
        routeId: "creationLearningCenter",
      },
      { id: "douyin-index", label: "抖音指数", routeId: "creationDouyinIndex" },
    ],
    separated: true,
  },
];
