import { ChartLineUp } from "@phosphor-icons/react/ChartLineUp";
import { ChatsCircle } from "@phosphor-icons/react/ChatsCircle";
import { Diamond } from "@phosphor-icons/react/Diamond";
import { Flag } from "@phosphor-icons/react/Flag";
import { House } from "@phosphor-icons/react/House";
import { Lightning } from "@phosphor-icons/react/Lightning";
import { Play } from "@phosphor-icons/react/Play";
import type { ReactNode } from "react";

import type { DashboardPanel } from "../../types";

type SidebarNavChild = {
  id: string;
  label: string;
  panel?: DashboardPanel;
};

type SidebarNavLeaf = {
  kind: "leaf";
  id: string;
  label: string;
  icon: ReactNode;
  panel: DashboardPanel;
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
const sidebarIconWeight = "regular" as const;

export const sidebarNavItems: SidebarNavItem[] = [
  {
    kind: "leaf",
    id: "home",
    label: "首页",
    icon: (
      <House className={sidebarIconClassName} weight={sidebarIconWeight} />
    ),
    panel: "overview",
    primary: true,
  },
  {
    kind: "leaf",
    id: "activity",
    label: "活动管理",
    icon: <Flag className={sidebarIconClassName} weight={sidebarIconWeight} />,
    panel: "board",
    separated: true,
  },
  {
    kind: "group",
    id: "content",
    label: "内容管理",
    icon: <Play className={sidebarIconClassName} weight={sidebarIconWeight} />,
    children: [
      { id: "works", label: "作品管理" },
      { id: "collections", label: "合集管理" },
      { id: "co-creation", label: "共创中心" },
      { id: "original-protection", label: "原创保护中心" },
    ],
  },
  {
    kind: "group",
    id: "interaction",
    label: "互动管理",
    icon: (
      <ChatsCircle
        className={sidebarIconClassName}
        weight={sidebarIconWeight}
      />
    ),
    children: [
      { id: "follows", label: "关注管理" },
      { id: "fans", label: "粉丝管理" },
      { id: "comments", label: "评论管理" },
      { id: "danmaku", label: "弹幕管理" },
      { id: "messages", label: "私信管理" },
    ],
  },
  {
    kind: "group",
    id: "data",
    label: "数据中心",
    icon: (
      <ChartLineUp
        className={sidebarIconClassName}
        weight={sidebarIconWeight}
      />
    ),
    children: [
      { id: "account-overview", label: "账号总览", panel: "table" },
      { id: "work-analysis", label: "作品分析" },
      { id: "fan-analysis", label: "粉丝分析" },
      { id: "key-focus", label: "重点关心" },
    ],
    separated: true,
  },
  {
    kind: "group",
    id: "monetization",
    label: "变现中心",
    icon: (
      <Diamond className={sidebarIconClassName} weight={sidebarIconWeight} />
    ),
    children: [
      { id: "monetization-market", label: "变现广场" },
      { id: "my-tasks", label: "我的任务" },
      { id: "my-income", label: "我的收入" },
    ],
    defaultOpen: true,
  },
  {
    kind: "group",
    id: "creation",
    label: "创作中心",
    icon: (
      <Lightning className={sidebarIconClassName} weight={sidebarIconWeight} />
    ),
    children: [
      { id: "creative-inspiration", label: "创作灵感" },
      { id: "learning-center", label: "学习中心" },
      { id: "douyin-index", label: "抖音指数" },
    ],
    separated: true,
  },
];
