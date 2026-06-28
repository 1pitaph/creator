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

type DashboardGridPreset = {
  w: number;
  h: number;
};

export const dashboardCardSizeOrder: DashboardCardSize[] = ["small", "medium", "large"];

const legacySizeMap: Record<string, DashboardCardSize> = {
  sm: "small",
  md: "medium",
  wide: "large",
  tall: "medium",
  hero: "large"
};

const sizeGrid: Record<DashboardCardSize, Record<DashboardBreakpoint, DashboardGridPreset>> = {
  small: {
    lg: { w: 3, h: 5 },
    md: { w: 4, h: 5 },
    sm: { w: 2, h: 5 },
    xs: { w: 2, h: 5 }
  },
  medium: {
    lg: { w: 4, h: 9 },
    md: { w: 4, h: 9 },
    sm: { w: 4, h: 8 },
    xs: { w: 2, h: 8 }
  },
  large: {
    lg: { w: 8, h: 9 },
    md: { w: 8, h: 9 },
    sm: { w: 4, h: 9 },
    xs: { w: 2, h: 8 }
  }
};

export const chartHeightBySize: Record<DashboardCardSize, number> = {
  small: 56,
  medium: 140,
  large: 260
};

export const normalizeDashboardCardSize = (value: unknown, fallback: DashboardCardSize = "medium"): DashboardCardSize => {
  if (typeof value !== "string") {
    return fallback;
  }

  if (dashboardCardSizeOrder.includes(value as DashboardCardSize)) {
    return value as DashboardCardSize;
  }

  return legacySizeMap[value] ?? fallback;
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
      defaultSize: "large",
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
      defaultSize: "small" as const,
      askTarget: metric.askTarget,
      metric
    })),
    {
      id: "trend-comparison",
      kind: "trend",
      title: "7 日趋势对照",
      description: "播放、完播、互动和转粉趋势对照。",
      priority: 30,
      defaultSize: "large",
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
      priority: 1,
      defaultSize: "medium",
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
      priority: 31,
      defaultSize: "medium",
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
      priority: 40,
      defaultSize: "large",
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
      priority: 32,
      defaultSize: "medium",
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

const getGridPreset = (size: DashboardCardSize, breakpoint: DashboardBreakpoint) => {
  const cols = dashboardColumnCounts[breakpoint];
  const preset = sizeGrid[size][breakpoint];

  return {
    w: Math.min(preset.w, cols),
    h: preset.h
  };
};

export const createDashboardGridItem = (
  card: DashboardCardDefinition,
  breakpoint: DashboardBreakpoint,
  x: number,
  y: number,
  size: DashboardCardSize = card.defaultSize
): DashboardGridItem => {
  const preset = getGridPreset(size, breakpoint);

  return {
    i: card.id,
    x,
    y,
    w: preset.w,
    h: preset.h,
    minW: preset.w,
    minH: preset.h,
    maxW: preset.w,
    maxH: preset.h
  };
};

export const orderDashboardCardsByLayout = (cards: DashboardCardDefinition[], layout: DashboardGridItem[] | undefined) => {
  if (!layout?.length) {
    return cards;
  }

  const cardById = new Map(cards.map((card) => [card.id, card]));
  const cardIndexById = new Map(cards.map((card, index) => [card.id, index]));
  const seen = new Set<string>();
  const ordered = [...layout]
    .filter((item) => cardById.has(item.i))
    .sort((a, b) => a.y - b.y || a.x - b.x || (cardIndexById.get(a.i) ?? 0) - (cardIndexById.get(b.i) ?? 0))
    .flatMap((item) => {
      const card = cardById.get(item.i);

      if (!card || seen.has(card.id)) {
        return [];
      }

      seen.add(card.id);
      return [card];
    });

  return [...ordered, ...cards.filter((card) => !seen.has(card.id))];
};

export const createDashboardLayout = (
  cards: DashboardCardDefinition[],
  breakpoint: DashboardBreakpoint,
  cardPreferences: DashboardPreferencesV1["cards"] = {}
) => {
  const cols = dashboardColumnCounts[breakpoint];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  return cards.map((card) => {
    const size = normalizeDashboardCardSize(cardPreferences[card.id]?.size, card.defaultSize);
    const preset = getGridPreset(size, breakpoint);

    if (cursorX + preset.w > cols) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }

    const item = createDashboardGridItem(card, breakpoint, cursorX, cursorY, size);
    cursorX += preset.w;
    rowHeight = Math.max(rowHeight, item.h);

    return item;
  });
};

export const createDashboardLayouts = (
  cards: DashboardCardDefinition[],
  cardPreferences: DashboardPreferencesV1["cards"] = {},
  sourceLayouts?: DashboardPreferencesV1["visual"]["layouts"]
) =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => {
      const orderedCards = orderDashboardCardsByLayout(cards, sourceLayouts?.[breakpoint]);
      return [breakpoint, createDashboardLayout(orderedCards, breakpoint, cardPreferences)];
    })
  ) as DashboardPreferencesV1["visual"]["layouts"];

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
): DashboardPreferencesV1 => {
  const defaultCards = Object.fromEntries(cards.map((card) => [card.id, { visible: true, size: card.defaultSize }])) as DashboardPreferencesV1["cards"];

  return {
    version: 1,
    creatorId,
    selectedView: "visual",
    updatedAt: now,
    cards: defaultCards,
    visual: {
      layouts: createDashboardLayouts(cards, defaultCards)
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
  };
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
      return [card.id, saved ? { visible: saved.visible, size: normalizeDashboardCardSize(saved.size, card.defaultSize) } : defaults.cards[card.id]];
    })
  ) as DashboardPreferencesV1["cards"];

  const sourceLayouts = Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => [breakpoint, (preferences.visual.layouts[breakpoint] ?? []).filter((item) => cardIds.has(item.i))])
  ) as DashboardPreferencesV1["visual"]["layouts"];
  const layouts = createDashboardLayouts(cards, reconciledCards, sourceLayouts);

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

const migrateDashboardPreferencesInput = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as { cards?: unknown };

  if (!candidate.cards || typeof candidate.cards !== "object") {
    return value;
  }

  const cards = Object.fromEntries(
    Object.entries(candidate.cards as Record<string, unknown>).map(([cardId, preference]) => {
      if (!preference || typeof preference !== "object") {
        return [cardId, preference];
      }

      const cardPreference = preference as { size?: unknown; visible?: unknown };

      return [
        cardId,
        {
          ...cardPreference,
          size: normalizeDashboardCardSize(cardPreference.size)
        }
      ];
    })
  );

  return {
    ...candidate,
    cards
  };
};

export const parseDashboardPreferences = (value: unknown) => {
  const parsed = DashboardPreferencesV1Schema.safeParse(migrateDashboardPreferencesInput(value));
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
