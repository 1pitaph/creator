import {
  DashboardPreferencesV1Schema,
  type AiModuleMetadata,
  type ChartIntent,
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

export type DashboardCardKind = "summary" | "metric" | "trend" | "insights" | "top-content" | "modules" | "module-chart" | "actions";

export type DashboardCardDefinition = {
  id: string;
  kind: DashboardCardKind;
  title: string;
  description: string;
  priority: number;
  defaultSize: DashboardCardSize;
  askTarget: AskTarget;
  chartIntent?: ChartIntent;
  metric?: MetricDefinition;
  module?: AiModuleMetadata;
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

export const dashboardBreakpointWidths: Record<DashboardBreakpoint, number> = {
  lg: 1200,
  md: 900,
  sm: 640,
  xs: 0
};

export const getDashboardBreakpointForWidth = (width: number): DashboardBreakpoint => {
  if (width >= dashboardBreakpointWidths.lg) {
    return "lg";
  }

  if (width >= dashboardBreakpointWidths.md) {
    return "md";
  }

  if (width >= dashboardBreakpointWidths.sm) {
    return "sm";
  }

  return "xs";
};

export const getDashboardMasonryColumnCount = (width: number) => {
  const measuredWidth = Number.isFinite(width) ? width : 0;

  if (measuredWidth >= dashboardBreakpointWidths.lg) {
    return dashboardColumnCounts.lg;
  }

  if (measuredWidth >= dashboardBreakpointWidths.md) {
    return dashboardColumnCounts.md;
  }

  if (measuredWidth >= dashboardBreakpointWidths.sm) {
    return dashboardColumnCounts.sm;
  }

  return dashboardColumnCounts.xs;
};

export type DashboardCardDimensions = {
  width: DashboardCardSize;
  height: DashboardCardSize;
};

export const dashboardCardSizeOrder: DashboardCardSize[] = ["small", "medium", "large"];

const legacySizeMap: Record<string, DashboardCardSize> = {
  sm: "small",
  md: "medium",
  wide: "large",
  tall: "medium",
  hero: "large"
};

const legacyDimensionMap: Record<string, DashboardCardDimensions> = {
  sm: { width: "small", height: "small" },
  md: { width: "medium", height: "medium" },
  wide: { width: "large", height: "medium" },
  tall: { width: "medium", height: "large" },
  hero: { width: "large", height: "large" }
};

const widthGrid: Record<DashboardCardSize, Record<DashboardBreakpoint, number>> = {
  small: {
    lg: 3,
    md: 2,
    sm: 2,
    xs: 2
  },
  medium: {
    lg: 4,
    md: 4,
    sm: 4,
    xs: 2
  },
  large: {
    lg: 8,
    md: 8,
    sm: 4,
    xs: 2
  }
};

const heightGrid: Record<DashboardCardSize, Record<DashboardBreakpoint, number>> = {
  small: {
    lg: 5,
    md: 5,
    sm: 5,
    xs: 5
  },
  medium: {
    lg: 8,
    md: 8,
    sm: 7,
    xs: 7
  },
  large: {
    lg: 11,
    md: 10,
    sm: 9,
    xs: 8
  }
};

const compactSummaryHeightGrid: Record<DashboardBreakpoint, number> = {
  lg: 7,
  md: 7,
  sm: 8,
  xs: heightGrid.large.xs
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

const defaultDimensionsForSize = (size: DashboardCardSize): DashboardCardDimensions => ({
  width: size,
  height: size
});

export const normalizeDashboardCardDimensions = (
  value: unknown,
  fallbackSize: DashboardCardSize = "medium"
): DashboardCardDimensions => {
  const fallback = defaultDimensionsForSize(fallbackSize);

  if (typeof value === "string") {
    return legacyDimensionMap[value] ?? defaultDimensionsForSize(normalizeDashboardCardSize(value, fallbackSize));
  }

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const preference = value as { height?: unknown; size?: unknown; width?: unknown };
  const legacyDimensions =
    typeof preference.size === "string"
      ? legacyDimensionMap[preference.size] ?? defaultDimensionsForSize(normalizeDashboardCardSize(preference.size, fallbackSize))
      : undefined;

  return {
    width: normalizeDashboardCardSize(preference.width, legacyDimensions?.width ?? fallback.width),
    height: normalizeDashboardCardSize(preference.height, legacyDimensions?.height ?? fallback.height)
  };
};

export const getDashboardCardContentSize = ({ height, width }: DashboardCardDimensions): DashboardCardSize => {
  const widthIndex = dashboardCardSizeOrder.indexOf(width);
  const heightIndex = dashboardCardSizeOrder.indexOf(height);
  const contentIndex = Math.min(widthIndex, heightIndex);

  return dashboardCardSizeOrder[contentIndex] ?? "medium";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeGridNumber = (value: number, fallback: number) => (Number.isFinite(value) ? Math.round(value) : fallback);

const normalizeDashboardColumnCount = (cols: number, fallback: number) => Math.max(1, normalizeGridNumber(cols, fallback));

export const getDashboardCardGridConstraints = (
  card: DashboardCardDefinition,
  breakpoint: DashboardBreakpoint,
  cols = dashboardColumnCounts[breakpoint]
) => {
  const columnCount = normalizeDashboardColumnCount(cols, dashboardColumnCounts[breakpoint]);
  const baseMinW = card.kind === "metric" ? 2 : 3;
  const baseMinH = card.kind === "metric" ? 5 : 6;

  return {
    minW: Math.min(baseMinW, columnCount),
    minH: baseMinH,
    maxW: columnCount,
    maxH: 16
  };
};

export const normalizeDashboardGridItem = (
  item: DashboardGridItem,
  breakpoint: DashboardBreakpoint,
  card: DashboardCardDefinition,
  cols = dashboardColumnCounts[breakpoint]
): DashboardGridItem => {
  const columnCount = normalizeDashboardColumnCount(cols, dashboardColumnCounts[breakpoint]);
  const constraints = getDashboardCardGridConstraints(card, breakpoint, columnCount);
  const w = clamp(normalizeGridNumber(item.w, constraints.minW), constraints.minW, constraints.maxW);
  const x = clamp(normalizeGridNumber(item.x, 0), 0, Math.max(columnCount - w, 0));

  return {
    i: card.id,
    x,
    y: Math.max(normalizeGridNumber(item.y, 0), 0),
    w,
    h: clamp(normalizeGridNumber(item.h, constraints.minH), constraints.minH, constraints.maxH),
    ...constraints
  };
};

export const getDashboardCardContentSizeForGridItem = (
  item: DashboardGridItem,
  cols = dashboardColumnCounts.lg,
  card?: DashboardCardDefinition
): DashboardCardSize => {
  const columnCount = normalizeDashboardColumnCount(cols, dashboardColumnCounts.lg);
  const isFullWidth = item.w >= columnCount;
  const keepsRichContentOnNarrowGrid = columnCount <= dashboardColumnCounts.xs && isFullWidth && card?.kind !== "metric";
  const keepsRichContentWhenFullWidth =
    isFullWidth && (card?.kind === "summary" || card?.kind === "insights" || card?.kind === "module-chart");

  if (card?.kind === "summary" && columnCount >= dashboardColumnCounts.md && item.w >= 7 && item.h >= 7) {
    return "large";
  }

  if ((keepsRichContentOnNarrowGrid || keepsRichContentWhenFullWidth) && item.h >= Math.max(item.minH ?? 1, 6)) {
    return item.h >= 10 ? "large" : "medium";
  }

  if (item.w <= Math.max(item.minW ?? 1, 3) || item.h <= Math.max(item.minH ?? 1, 6)) {
    return "small";
  }

  if (columnCount >= dashboardColumnCounts.md && item.w >= 7 && item.h >= 10) {
    return "large";
  }

  return "medium";
};

export const createActionCardId = (insightId: string, index: number) => `action:${insightId}:${index}`;
export const createModuleChartCardId = (moduleId: string) => `module-chart:${moduleId}`;
export const isModuleChartCardId = (cardId: string) => cardId.startsWith("module-chart:");

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
    ...diagnosis.modules.flatMap((module, index) => {
      if (!module.chart) {
        return [];
      }

      return [
        {
          id: createModuleChartCardId(module.id),
          kind: "module-chart" as const,
          title: module.chart.title,
          description: module.chart.description ?? module.description,
          priority: 20 + index,
          defaultSize: "medium" as const,
          askTarget: {
            title: `${module.name} · ${module.chart.title}`,
            moduleId: module.id,
            prompt: `请基于「${module.name}」模块的「${module.chart.title}」图表，解释指标变化、异常点和下一步动作。`,
            summary: module.chart.description ?? module.description,
            evidence: module.tags
          },
          chartIntent: module.chart,
          module
        }
      ];
    }),
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

const getGridPreset = (
  dimensions: DashboardCardDimensions,
  breakpoint: DashboardBreakpoint,
  card: DashboardCardDefinition,
  cols = dashboardColumnCounts[breakpoint]
) => {
  const columnCount = normalizeDashboardColumnCount(cols, dashboardColumnCounts[breakpoint]);
  const compactSummaryHeight =
    card.kind === "summary" && dimensions.width === "large" && dimensions.height === "large"
      ? compactSummaryHeightGrid[breakpoint]
      : undefined;

  return {
    w: Math.min(widthGrid[dimensions.width][breakpoint], columnCount),
    h: compactSummaryHeight ?? heightGrid[dimensions.height][breakpoint]
  };
};

export const createDashboardGridItem = (
  card: DashboardCardDefinition,
  breakpoint: DashboardBreakpoint,
  x: number,
  y: number,
  dimensions: DashboardCardDimensions = defaultDimensionsForSize(card.defaultSize),
  cols = dashboardColumnCounts[breakpoint]
): DashboardGridItem => {
  const preset = getGridPreset(dimensions, breakpoint, card, cols);

  return normalizeDashboardGridItem({
    i: card.id,
    x,
    y,
    w: preset.w,
    h: preset.h
  }, breakpoint, card, cols);
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

const findDashboardMasonryPosition = (item: DashboardGridItem, columnHeights: number[], cols: number) => {
  const maxX = Math.max(cols - item.w, 0);
  let bestX = 0;
  let bestY = Number.POSITIVE_INFINITY;

  for (let x = 0; x <= maxX; x += 1) {
    const y = Math.max(...columnHeights.slice(x, x + item.w));

    if (y < bestY || (y === bestY && x < bestX)) {
      bestX = x;
      bestY = y;
    }
  }

  return {
    x: bestX,
    y: Number.isFinite(bestY) ? bestY : 0
  };
};

export const packDashboardMasonryLayout = (
  cards: DashboardCardDefinition[],
  breakpoint: DashboardBreakpoint,
  cols = dashboardColumnCounts[breakpoint],
  cardPreferences: DashboardPreferencesV1["cards"] = {},
  sourceLayout?: DashboardGridItem[]
) => {
  const columnCount = normalizeDashboardColumnCount(cols, dashboardColumnCounts[breakpoint]);
  const orderedCards = orderDashboardCardsByLayout(cards, sourceLayout);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const sourceItemById = new Map<string, DashboardGridItem>();
  const columnHeights = Array.from({ length: columnCount }, () => 0);
  const packedItems: DashboardGridItem[] = [];

  sourceLayout?.forEach((item) => {
    const card = cardById.get(item.i);

    if (card && !sourceItemById.has(card.id)) {
      sourceItemById.set(card.id, normalizeDashboardGridItem(item, breakpoint, card, columnCount));
    }
  });

  orderedCards.forEach((card) => {
    const dimensions = normalizeDashboardCardDimensions(cardPreferences[card.id], card.defaultSize);
    const item =
      sourceItemById.get(card.id) ??
      createDashboardGridItem(card, breakpoint, 0, 0, dimensions, columnCount);
    const position = findDashboardMasonryPosition(item, columnHeights, columnCount);
    const packedItem = {
      ...item,
      ...position
    };

    for (let column = packedItem.x; column < packedItem.x + packedItem.w; column += 1) {
      columnHeights[column] = packedItem.y + packedItem.h;
    }

    packedItems.push(packedItem);
  });

  return packedItems;
};

export const createDashboardLayout = (
  cards: DashboardCardDefinition[],
  breakpoint: DashboardBreakpoint,
  cardPreferences: DashboardPreferencesV1["cards"] = {},
  cols = dashboardColumnCounts[breakpoint]
) => packDashboardMasonryLayout(cards, breakpoint, cols, cardPreferences);

export const createDashboardLayouts = (
  cards: DashboardCardDefinition[],
  cardPreferences: DashboardPreferencesV1["cards"] = {},
  sourceLayouts?: DashboardPreferencesV1["visual"]["layouts"]
) =>
  Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => {
      const sourceLayout = sourceLayouts?.[breakpoint];

      return [
        breakpoint,
        packDashboardMasonryLayout(cards, breakpoint, dashboardColumnCounts[breakpoint], cardPreferences, sourceLayout)
      ];
    })
  ) as DashboardPreferencesV1["visual"]["layouts"];

const preserveMissingModuleChartCards = (
  currentCards: DashboardPreferencesV1["cards"],
  savedCards: DashboardPreferencesV1["cards"],
  cardIds: Set<string>
) => {
  const nextCards = { ...currentCards };

  Object.entries(savedCards).forEach(([cardId, saved]) => {
    if (!isModuleChartCardId(cardId) || cardIds.has(cardId)) {
      return;
    }

    nextCards[cardId] = {
      visible: saved.visible,
      ...normalizeDashboardCardDimensions(saved, "medium")
    };
  });

  return nextCards;
};

const appendMissingModuleChartLayoutItems = (
  layout: DashboardGridItem[],
  savedLayout: DashboardGridItem[],
  cardIds: Set<string>
) => {
  const nextLayout = [...layout];
  const layoutIds = new Set(nextLayout.map((item) => item.i));

  savedLayout.forEach((item) => {
    if (!isModuleChartCardId(item.i) || cardIds.has(item.i) || layoutIds.has(item.i)) {
      return;
    }

    nextLayout.push(item);
    layoutIds.add(item.i);
  });

  return nextLayout;
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
): DashboardPreferencesV1 => {
  const defaultCards = Object.fromEntries(
    cards.map((card) => [
      card.id,
      {
        visible: true,
        ...defaultDimensionsForSize(card.defaultSize)
      }
    ])
  ) as DashboardPreferencesV1["cards"];

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

  const currentCards = Object.fromEntries(
    cards.map((card) => {
      const saved = preferences.cards[card.id];
      return [
        card.id,
        saved
          ? {
              visible: saved.visible,
              ...normalizeDashboardCardDimensions(saved, card.defaultSize)
            }
          : defaults.cards[card.id]
      ];
    })
  ) as DashboardPreferencesV1["cards"];
  const reconciledCards = preserveMissingModuleChartCards(currentCards, preferences.cards, cardIds);

  const sourceLayouts = Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => [breakpoint, (preferences.visual.layouts[breakpoint] ?? []).filter((item) => cardIds.has(item.i))])
  ) as DashboardPreferencesV1["visual"]["layouts"];
  const currentLayouts = createDashboardLayouts(cards, reconciledCards, sourceLayouts);
  const layouts = Object.fromEntries(
    dashboardBreakpoints.map((breakpoint) => [
      breakpoint,
      appendMissingModuleChartLayoutItems(currentLayouts[breakpoint], preferences.visual.layouts[breakpoint] ?? [], cardIds)
    ])
  ) as DashboardPreferencesV1["visual"]["layouts"];
  const tableSortField = preferences.table.sort.field === "size" ? "width" : preferences.table.sort.field;

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
      sort: {
        ...preferences.table.sort,
        field: tableSortField
      }
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

      const cardPreference = preference as { height?: unknown; size?: unknown; visible?: unknown; width?: unknown };
      const dimensions = normalizeDashboardCardDimensions(cardPreference);

      return [
        cardId,
        {
          ...cardPreference,
          ...dimensions
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
