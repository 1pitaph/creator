import {
  DashboardPreferencesV1Schema,
  type DashboardBoardColumn,
  type DashboardBreakpoint,
  type DashboardCardSize,
  type DashboardGridItem,
  type DashboardPreferencesV1,
  type DashboardView,
  type DiagnosisResponse,
  type InsightAction
} from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel, MetricDefinition } from "../../types";

export type DashboardCardKind = "summary" | "metric" | "trend" | "insights" | "top-content" | "modules" | "actions";

export type DashboardCardDefinition = {
  id: string;
  kind: DashboardCardKind;
  title: string;
  description: string;
  priority: number;
  defaultSize: DashboardCardSize;
  askTarget: AskTarget;
  metric?: MetricDefinition;
};

export type DashboardActionCard = InsightAction & {
  id: string;
  insightTitle: string;
  moduleId: string;
};

export const dashboardBreakpoints: DashboardBreakpoint[] = ["lg", "md", "sm", "xs"];
export const dashboardBoardColumns: DashboardBoardColumn[] = ["today", "next", "this_week", "done"];

export const dashboardColumnCounts: Record<DashboardBreakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 2
};

const sizeGrid: Record<DashboardCardSize, Record<DashboardBreakpoint, { w: number; h: number; minW: number; minH: number }>> = {
  sm: {
    lg: { w: 3, h: 5, minW: 2, minH: 4 },
    md: { w: 4, h: 5, minW: 3, minH: 4 },
    sm: { w: 2, h: 5, minW: 2, minH: 4 },
    xs: { w: 2, h: 5, minW: 2, minH: 4 }
  },
  md: {
    lg: { w: 4, h: 6, minW: 3, minH: 5 },
    md: { w: 4, h: 6, minW: 3, minH: 5 },
    sm: { w: 4, h: 6, minW: 2, minH: 5 },
    xs: { w: 2, h: 6, minW: 2, minH: 5 }
  },
  wide: {
    lg: { w: 6, h: 7, minW: 4, minH: 5 },
    md: { w: 8, h: 7, minW: 4, minH: 5 },
    sm: { w: 4, h: 7, minW: 3, minH: 5 },
    xs: { w: 2, h: 7, minW: 2, minH: 5 }
  },
  tall: {
    lg: { w: 4, h: 9, minW: 3, minH: 6 },
    md: { w: 4, h: 9, minW: 3, minH: 6 },
    sm: { w: 4, h: 8, minW: 3, minH: 6 },
    xs: { w: 2, h: 8, minW: 2, minH: 6 }
  },
  hero: {
    lg: { w: 8, h: 10, minW: 5, minH: 7 },
    md: { w: 8, h: 10, minW: 4, minH: 7 },
    sm: { w: 4, h: 9, minW: 4, minH: 7 },
    xs: { w: 2, h: 8, minW: 2, minH: 6 }
  }
};

export const chartHeightBySize: Record<DashboardCardSize, number> = {
  sm: 64,
  md: 112,
  wide: 180,
  tall: 180,
  hero: 280
};

export const createActionCardId = (insightId: string, index: number) => `action:${insightId}:${index}`;

export const buildDashboardCards = (diagnosis: DiagnosisResponse, viewModel: DashboardViewModel): DashboardCardDefinition[] => {
  const topInsight = viewModel.topInsight;
  const cards: DashboardCardDefinition[] = [
    {
      id: "summary",
      kind: "summary",
      title: "AI 诊断摘要",
      description: "账号健康度、阶段、目标与首要问题。",
      priority: 0,
      defaultSize: "wide",
      askTarget: {
        title: "AI 诊断摘要",
        prompt: `请总结「${diagnosis.creator.displayName}」当前最重要的增长问题，并按优先级给 3 个动作。`,
        summary: topInsight?.summary,
        evidence: topInsight?.evidence
      }
    },
    ...viewModel.metricCards.map((metric, index) => ({
      id: `metric:${metric.id}`,
      kind: "metric" as const,
      title: metric.label,
      description: metric.helper,
      priority: 10 + index,
      defaultSize: "sm" as const,
      askTarget: metric.askTarget,
      metric
    })),
    {
      id: "trend-comparison",
      kind: "trend",
      title: "7 日趋势对照",
      description: "播放、完播、互动和转粉趋势对照。",
      priority: 30,
      defaultSize: "hero",
      askTarget: {
        title: "7 日趋势对照",
        prompt: `请结合 7 日趋势，找出「${diagnosis.creator.displayName}」波动最大的指标，并给一个排查顺序。`,
        summary: "播放、完播、互动、转粉趋势对照",
        evidence: diagnosis.metrics.history.map((item) => `${item.date} 播放 ${item.views}`)
      }
    },
    {
      id: "insights",
      kind: "insights",
      title: "AI 诊断优先级",
      description: "按风险和机会排序的诊断结果。",
      priority: 40,
      defaultSize: "tall",
      askTarget: {
        title: "AI 诊断优先级",
        prompt: `请基于诊断优先级，告诉我「${diagnosis.creator.displayName}」今天应该先做哪一件事，为什么？`,
        summary: topInsight?.summary,
        evidence: topInsight?.evidence
      }
    },
    {
      id: "top-content",
      kind: "top-content",
      title: "高表现内容样本",
      description: "可复用的内容结构与机会点。",
      priority: 50,
      defaultSize: "wide",
      askTarget: {
        title: "高表现内容样本",
        prompt: `请基于高表现内容样本，为「${diagnosis.creator.displayName}」提炼可复用的标题、开头和结尾模板。`,
        summary: viewModel.topContent?.title,
        evidence: diagnosis.metrics.topContents.map((item) => item.opportunity)
      }
    },
    {
      id: "modules",
      kind: "modules",
      title: "已加载 AI 模块",
      description: "当前画像触发的分析模块。",
      priority: 60,
      defaultSize: "tall",
      askTarget: {
        title: "已加载 AI 模块",
        prompt: `请解释为什么「${diagnosis.creator.displayName}」当前加载了这些 AI 分析模块，并说明每个模块负责什么。`,
        summary: `共加载 ${diagnosis.modules.length} 个模块`,
        evidence: diagnosis.modules.map((module) => module.name)
      }
    },
    {
      id: "actions",
      kind: "actions",
      title: "下一步行动队列",
      description: "今天、下一步、本周和已完成行动。",
      priority: 70,
      defaultSize: "tall",
      askTarget: {
        title: "下一步行动队列",
        prompt: "请把当前所有诊断动作整理成「今天、明天、本周」三个时间段的行动清单。",
        summary: "根据所有 insight actions 汇总",
        evidence: diagnosis.insights.flatMap((insight) => insight.actions.map((action) => action.label))
      }
    }
  ];

  return cards.sort((a, b) => a.priority - b.priority);
};

export const buildDashboardActionCards = (diagnosis: DiagnosisResponse): DashboardActionCard[] =>
  diagnosis.insights.flatMap((insight) =>
    insight.actions.map((action, index) => ({
      ...action,
      id: createActionCardId(insight.id, index),
      insightTitle: insight.title,
      moduleId: insight.moduleId
    }))
  );

const createGridItem = (card: DashboardCardDefinition, breakpoint: DashboardBreakpoint, x: number, y: number): DashboardGridItem => {
  const cols = dashboardColumnCounts[breakpoint];
  const size = sizeGrid[card.defaultSize][breakpoint];
  const w = Math.min(size.w, cols);

  return {
    i: card.id,
    x,
    y,
    w,
    h: size.h,
    minW: Math.min(size.minW, w),
    minH: size.minH
  };
};

const createLayout = (cards: DashboardCardDefinition[], breakpoint: DashboardBreakpoint) => {
  const cols = dashboardColumnCounts[breakpoint];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  return cards.map((card) => {
    const size = sizeGrid[card.defaultSize][breakpoint];
    const w = Math.min(size.w, cols);

    if (cursorX + w > cols) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }

    const item = createGridItem(card, breakpoint, cursorX, cursorY);
    cursorX += w;
    rowHeight = Math.max(rowHeight, item.h);

    return item;
  });
};

const createBoardColumns = (actions: DashboardActionCard[]) => {
  const columns: Record<DashboardBoardColumn, string[]> = {
    today: [],
    next: [],
    this_week: [],
    done: []
  };

  actions.forEach((action, index) => {
    if (index === 0 || action.effort === "low") {
      columns.today.push(action.id);
      return;
    }

    if (action.effort === "medium") {
      columns.this_week.push(action.id);
      return;
    }

    columns.next.push(action.id);
  });

  return columns;
};

export const buildDefaultDashboardPreferences = (
  creatorId: string,
  cards: DashboardCardDefinition[],
  actions: DashboardActionCard[],
  now = new Date().toISOString()
): DashboardPreferencesV1 => ({
  version: 1,
  creatorId,
  selectedView: "visual",
  updatedAt: now,
  cards: Object.fromEntries(cards.map((card) => [card.id, { visible: true, size: card.defaultSize }])),
  visual: {
    layouts: Object.fromEntries(dashboardBreakpoints.map((breakpoint) => [breakpoint, createLayout(cards, breakpoint)])) as DashboardPreferencesV1["visual"]["layouts"]
  },
  board: {
    columns: createBoardColumns(actions)
  },
  table: {
    sort: {
      field: "priority",
      direction: "asc"
    }
  }
});

const filterGridItems = (items: DashboardGridItem[] | undefined, cardIds: Set<string>) => (items ?? []).filter((item) => cardIds.has(item.i));

const appendMissingGridItems = (
  items: DashboardGridItem[],
  cards: DashboardCardDefinition[],
  breakpoint: DashboardBreakpoint
) => {
  const existingIds = new Set(items.map((item) => item.i));
  const cols = dashboardColumnCounts[breakpoint];
  const bottom = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  let cursorX = 0;
  let cursorY = bottom;
  let rowHeight = 0;
  const nextItems = [...items];

  cards.forEach((card) => {
    if (existingIds.has(card.id)) {
      return;
    }

    const size = sizeGrid[card.defaultSize][breakpoint];
    const w = Math.min(size.w, cols);

    if (cursorX + w > cols) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }

    const item = createGridItem(card, breakpoint, cursorX, cursorY);
    nextItems.push(item);
    cursorX += w;
    rowHeight = Math.max(rowHeight, item.h);
  });

  return nextItems;
};

export const reconcileDashboardPreferences = (
  preferences: DashboardPreferencesV1,
  creatorId: string,
  cards: DashboardCardDefinition[],
  actions: DashboardActionCard[],
  now = new Date().toISOString()
): DashboardPreferencesV1 => {
  const defaults = buildDefaultDashboardPreferences(creatorId, cards, actions, now);
  const cardIds = new Set(cards.map((card) => card.id));
  const actionIds = new Set(actions.map((action) => action.id));

  const reconciledCards = Object.fromEntries(
    cards.map((card) => {
      const saved = preferences.cards[card.id];
      return [card.id, saved ? { visible: saved.visible, size: saved.size } : defaults.cards[card.id]];
    })
  ) as DashboardPreferencesV1["cards"];

  const layouts = Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => {
      const filtered = filterGridItems(preferences.visual.layouts[breakpoint], cardIds);
      return [breakpoint, appendMissingGridItems(filtered, cards, breakpoint)];
    })
  ) as DashboardPreferencesV1["visual"]["layouts"];

  const assignedActions = new Set<string>();
  const columns = Object.fromEntries(
    dashboardBoardColumns.map((column) => {
      const ids = preferences.board.columns[column].filter((id) => {
        if (!actionIds.has(id) || assignedActions.has(id)) {
          return false;
        }

        assignedActions.add(id);
        return true;
      });

      return [column, ids];
    })
  ) as DashboardPreferencesV1["board"]["columns"];

  defaults.board.columns.today.forEach((id) => {
    if (!assignedActions.has(id)) {
      columns.today.push(id);
      assignedActions.add(id);
    }
  });
  defaults.board.columns.next.forEach((id) => {
    if (!assignedActions.has(id)) {
      columns.next.push(id);
      assignedActions.add(id);
    }
  });
  defaults.board.columns.this_week.forEach((id) => {
    if (!assignedActions.has(id)) {
      columns.this_week.push(id);
      assignedActions.add(id);
    }
  });

  return {
    ...preferences,
    version: 1,
    creatorId,
    selectedView: preferences.selectedView,
    updatedAt: preferences.updatedAt,
    cards: reconciledCards,
    visual: {
      layouts
    },
    board: {
      columns
    },
    table: {
      sort: preferences.table.sort
    }
  };
};

export const parseDashboardPreferences = (value: unknown) => {
  const parsed = DashboardPreferencesV1Schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const pickNewestDashboardPreferences = (
  current: DashboardPreferencesV1,
  candidate: DashboardPreferencesV1 | null
) => {
  if (!candidate) {
    return current;
  }

  return Date.parse(candidate.updatedAt) > Date.parse(current.updatedAt) ? candidate : current;
};

export const updateDashboardPreferencesTimestamp = (
  preferences: DashboardPreferencesV1,
  updatedAt = new Date().toISOString()
): DashboardPreferencesV1 => ({
  ...preferences,
  updatedAt
});

export const setDashboardSelectedView = (preferences: DashboardPreferencesV1, selectedView: DashboardView) =>
  updateDashboardPreferencesTimestamp({
    ...preferences,
    selectedView
  });
