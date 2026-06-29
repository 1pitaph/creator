import { describe, expect, it } from "vitest";
import type { DashboardGridItem } from "@creator/data-contracts";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardViewModel } from "./model";
import {
  buildDashboardActionCards,
  buildDashboardCards,
  createDashboardLayouts,
  buildDefaultDashboardPreferences,
  createModuleChartCardId,
  dashboardBreakpoints,
  getDashboardCardContentSizeForGridItem,
  getDashboardMasonryColumnCount,
  parseDashboardPreferences,
  pickNewestDashboardPreferences,
  packDashboardMasonryLayout,
  reconcileDashboardGridLayout,
  reconcileDashboardPreferences,
} from "./customization";
import type { DashboardCardDefinition } from "./customization";

const buildFixture = () => {
  const diagnosis = localDiagnosis(defaultCreatorId);
  const viewModel = buildDashboardViewModel(diagnosis);
  const cards = buildDashboardCards(diagnosis, viewModel);
  const actions = buildDashboardActionCards(diagnosis);

  return { actions, cards, diagnosis, viewModel };
};

const dashboardGridItemsOverlap = (
  left: DashboardGridItem,
  right: DashboardGridItem,
) =>
  left.i !== right.i &&
  left.x < right.x + right.w &&
  left.x + left.w > right.x &&
  left.y < right.y + right.h &&
  left.y + left.h > right.y;

const expectLayoutToBeVerticallyCompact = (layout: DashboardGridItem[]) => {
  layout.forEach((item) => {
    expect(
      layout.some((other) => dashboardGridItemsOverlap(item, other)),
      `${item.i} overlaps another dashboard card`,
    ).toBe(false);

    if (item.y > 0) {
      expect(
        layout.some((other) =>
          dashboardGridItemsOverlap({ ...item, y: item.y - 1 }, other),
        ),
        `${item.i} can move upward from y=${item.y}`,
      ).toBe(true);
    }
  });
};

const buildMasonryTestCard = (
  id: string,
  priority: number,
): DashboardCardDefinition => ({
  id,
  kind: "metric",
  title: id,
  description: id,
  priority,
  defaultSize: "small",
  askTarget: {
    title: id,
    prompt: id,
  },
});

describe("dashboard customization", () => {
  it("maps measured widths to dynamic masonry column counts", () => {
    expect(getDashboardMasonryColumnCount(375)).toBe(2);
    expect(getDashboardMasonryColumnCount(640)).toBe(4);
    expect(getDashboardMasonryColumnCount(900)).toBe(8);
    expect(getDashboardMasonryColumnCount(1200)).toBe(12);
  });

  it("builds stable default preferences", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );

    expect(cards.some((card) => card.id === "modules")).toBe(false);
    expect(preferences.selectedView).toBe("visual");
    expect(Object.keys(preferences.cards)).toEqual(
      cards.map((card) => card.id),
    );
    expect(preferences.cards.summary).toMatchObject({
      width: "large",
      height: "large",
    });
    expect(preferences.cards.insights).toMatchObject({
      width: "medium",
      height: "medium",
    });
    expect(preferences.cards["metric:commerce"]).toMatchObject({
      width: "medium",
      height: "medium",
    });
    expect(preferences.cards["trend-comparison"]).toMatchObject({
      width: "large",
      height: "medium",
    });
    expect(preferences.visual.layouts.lg.map((item) => item.i)).toEqual(
      cards.map((card) => card.id),
    );
    expect(preferences.visual.layouts.lg.slice(0, 2)).toMatchObject([
      {
        i: "summary",
        x: 0,
        y: 0,
        w: 8,
        h: 7,
        minW: 3,
        minH: 6,
        maxW: 12,
        maxH: 16,
      },
      {
        i: "insights",
        x: 8,
        y: 0,
        w: 4,
        h: 7,
        minW: 3,
        minH: 6,
        maxW: 12,
        maxH: 16,
      },
    ]);
    expect(
      getDashboardCardContentSizeForGridItem(
        preferences.visual.layouts.lg.find((item) => item.i === "summary")!,
        12,
        cards.find((card) => card.id === "summary"),
      ),
    ).toBe("large");
    expect(
      preferences.visual.layouts.md.find((item) => item.i === "metric:views7d"),
    ).toMatchObject({
      w: 2,
      h: 5,
      minW: 2,
      minH: 5,
      maxW: 8,
      maxH: 16,
    });
    expect(
      preferences.visual.layouts.sm.find((item) => item.i === "insights"),
    ).toMatchObject({
      w: 4,
      h: 8,
      minW: 3,
      minH: 6,
      maxW: 4,
      maxH: 16,
    });
    expect(
      preferences.visual.layouts.lg.find((item) => item.i === "metric:views7d"),
    ).toMatchObject({
      x: 0,
      y: 7,
      w: 3,
      h: 5,
    });
    expect(
      [
        "metric:commerce",
        "module-chart:drama-revenue-radar",
        "module-chart:viral-review",
      ].map((cardId) =>
        preferences.visual.layouts.lg.find((item) => item.i === cardId),
      ),
    ).toMatchObject([
      { i: "metric:commerce", x: 0, y: 12, w: 4, h: 8 },
      { i: "module-chart:drama-revenue-radar", x: 4, y: 12, w: 4, h: 8 },
      { i: "module-chart:viral-review", x: 8, y: 12, w: 4, h: 8 },
    ]);
    expect(
      preferences.visual.layouts.lg.find(
        (item) => item.i === "trend-comparison",
      ),
    ).toMatchObject({ x: 0, y: 28, w: 8, h: 8 });
    dashboardBreakpoints.forEach((breakpoint) => {
      expect(
        preferences.visual.layouts[breakpoint].map((item) => item.i),
      ).toEqual(cards.map((card) => card.id));
    });
    Object.values(preferences.visual.layouts).forEach(
      expectLayoutToBeVerticallyCompact,
    );
    expect(preferences.board.columns.today.length).toBeGreaterThan(0);
  });

  it("packs new cards into the shortest available column group", () => {
    const cards = ["a", "b", "c", "d", "e"].map(buildMasonryTestCard);
    const layout = packDashboardMasonryLayout(cards, "lg", 8, {}, [
      { i: "a", x: 0, y: 0, w: 2, h: 12 },
      { i: "b", x: 0, y: 20, w: 2, h: 5 },
      { i: "c", x: 0, y: 40, w: 2, h: 9 },
      { i: "d", x: 0, y: 60, w: 2, h: 5 },
      { i: "e", x: 0, y: 80, w: 2, h: 5 },
    ]);

    expect(layout.map((item) => item.i)).toEqual(["a", "b", "c", "d", "e"]);
    expect(layout.find((item) => item.i === "e")).toMatchObject({
      x: 2,
      y: 5,
      w: 2,
      h: 5,
    });
    expectLayoutToBeVerticallyCompact(layout);
  });

  it("preserves saved card positions while packing missing cards", () => {
    const cards = ["a", "b", "c"].map(buildMasonryTestCard);
    const layout = reconcileDashboardGridLayout(cards, "lg", 8, {}, [
      { i: "a", x: 2, y: 5, w: 2, h: 5 },
      { i: "b", x: 0, y: 0, w: 2, h: 5 },
    ]);

    expect(layout.find((item) => item.i === "a")).toMatchObject({
      x: 2,
      y: 5,
      w: 2,
      h: 5,
    });
    expect(layout.find((item) => item.i === "b")).toMatchObject({
      x: 0,
      y: 0,
      w: 2,
      h: 5,
    });
    expect(layout.find((item) => item.i === "c")).toMatchObject({
      x: 4,
      y: 0,
      w: 3,
      h: 5,
    });
  });

  it("promotes AI module charts into standalone dashboard cards", () => {
    const { cards, diagnosis } = buildFixture();
    const chartModules = diagnosis.modules.filter((module) => module.chart);
    const moduleChartCards = cards.filter(
      (card) => card.kind === "module-chart",
    );
    const firstModule = chartModules[0];
    const firstCard = firstModule
      ? moduleChartCards.find(
          (card) => card.id === createModuleChartCardId(firstModule.id),
        )
      : undefined;

    expect(chartModules.length).toBeGreaterThan(0);
    expect(moduleChartCards.map((card) => card.id)).toEqual(
      chartModules.map((module) => createModuleChartCardId(module.id)),
    );
    expect(firstCard).toMatchObject({
      chartIntent: firstModule?.chart,
      defaultSize: "medium",
      description: firstModule?.chart?.description ?? firstModule?.description,
      module: firstModule,
      priority: 20,
      title: firstModule?.chart?.title,
    });
    expect(firstCard?.askTarget).toMatchObject({
      evidence: firstModule?.tags,
      moduleId: firstModule?.id,
      summary: firstModule?.chart?.description ?? firstModule?.description,
      title: `${firstModule?.name} · ${firstModule?.chart?.title}`,
    });
  });

  it("picks the newest saved preferences by updatedAt", () => {
    const { actions, cards } = buildFixture();
    const older = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const newer = {
      ...older,
      selectedView: "table" as const,
      updatedAt: "2026-06-29T00:00:00.000Z",
    };

    expect(pickNewestDashboardPreferences(older, newer).selectedView).toBe(
      "table",
    );
    expect(pickNewestDashboardPreferences(newer, older).selectedView).toBe(
      "table",
    );
  });

  it("rejects invalid cached preferences", () => {
    expect(parseDashboardPreferences({ version: 0 })).toBeNull();
  });

  it("migrates legacy cached card sizes while preserving saved grid dimensions and placement", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const parsed = parseDashboardPreferences({
      ...preferences,
      cards: {
        ...preferences.cards,
        summary: { visible: true, size: "wide" },
        insights: { visible: true, size: "tall" },
        "metric:views": { visible: true, size: "sm" },
      },
      visual: {
        layouts: {
          ...preferences.visual.layouts,
          lg: [{ i: "summary", x: 1, y: 2, w: 7, h: 9, minW: 1, minH: 1 }],
        },
      },
    });

    expect(parsed?.cards.summary).toMatchObject({
      width: "large",
      height: "medium",
    });
    expect(parsed?.cards.insights).toMatchObject({
      width: "medium",
      height: "large",
    });
    expect(parsed?.cards["metric:views"]).toMatchObject({
      width: "small",
      height: "small",
    });

    const reconciled = reconcileDashboardPreferences(
      parsed ?? preferences,
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(
      reconciled.visual.layouts.lg.find((item) => item.i === "summary"),
    ).toMatchObject({ x: 1, y: 2, h: 9, w: 7, minH: 6, minW: 3 });
    expect(reconciled.visual.layouts.lg.map((item) => item.i)).toEqual(
      cards.map((card) => card.id),
    );
  });

  it("migrates the old default revenue focus row into the full-width medium layout", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const legacyCards = {
      ...preferences.cards,
      "metric:commerce": {
        visible: true,
        width: "small" as const,
        height: "small" as const,
      },
    };
    const legacyPreferences = {
      ...preferences,
      cards: legacyCards,
      visual: {
        layouts: createDashboardLayouts(cards, legacyCards),
      },
    };

    const reconciled = reconcileDashboardPreferences(
      legacyPreferences,
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards["metric:commerce"]).toMatchObject({
      width: "medium",
      height: "medium",
    });
    expect(
      [
        "metric:commerce",
        "module-chart:drama-revenue-radar",
        "module-chart:viral-review",
      ].map((cardId) =>
        reconciled.visual.layouts.lg.find((item) => item.i === cardId),
      ),
    ).toMatchObject([
      { i: "metric:commerce", x: 0, y: 12, w: 4, h: 8 },
      { i: "module-chart:drama-revenue-radar", x: 4, y: 12, w: 4, h: 8 },
      { i: "module-chart:viral-review", x: 8, y: 12, w: 4, h: 8 },
    ]);
  });

  it("does not migrate the revenue focus row when a target card was manually adjusted", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const legacyCards = {
      ...preferences.cards,
      "metric:commerce": {
        visible: true,
        width: "small" as const,
        height: "small" as const,
      },
    };
    const legacyLayouts = createDashboardLayouts(cards, legacyCards);
    const manuallyAdjustedLayouts = {
      ...legacyLayouts,
      lg: legacyLayouts.lg.map((item) =>
        item.i === "metric:commerce" ? { ...item, x: 1 } : item,
      ),
    };

    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        cards: legacyCards,
        visual: {
          layouts: manuallyAdjustedLayouts,
        },
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards["metric:commerce"]).toMatchObject({
      width: "small",
      height: "small",
    });
    expect(
      reconciled.visual.layouts.lg.find((item) => item.i === "metric:commerce"),
    ).toMatchObject({ x: 1, y: 12, w: 3, h: 5 });
  });

  it("migrates the old default trend comparison card into the wide medium-height layout", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const legacyCards = {
      ...preferences.cards,
      "trend-comparison": {
        visible: true,
        width: "large" as const,
        height: "large" as const,
      },
    };
    const legacyPreferences = {
      ...preferences,
      cards: legacyCards,
      visual: {
        layouts: createDashboardLayouts(cards, legacyCards),
      },
    };

    const reconciled = reconcileDashboardPreferences(
      legacyPreferences,
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards["trend-comparison"]).toMatchObject({
      width: "large",
      height: "medium",
    });
    expect(
      reconciled.visual.layouts.lg.find(
        (item) => item.i === "trend-comparison",
      ),
    ).toMatchObject({ x: 0, y: 28, w: 8, h: 8 });
  });

  it("does not migrate the trend comparison card when it was manually adjusted", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const legacyCards = {
      ...preferences.cards,
      "trend-comparison": {
        visible: true,
        width: "large" as const,
        height: "large" as const,
      },
    };
    const legacyLayouts = createDashboardLayouts(cards, legacyCards);
    const manuallyAdjustedLayouts = {
      ...legacyLayouts,
      lg: legacyLayouts.lg.map((item) =>
        item.i === "trend-comparison" ? { ...item, y: item.y + 1 } : item,
      ),
    };

    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        cards: legacyCards,
        visual: {
          layouts: manuallyAdjustedLayouts,
        },
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards["trend-comparison"]).toMatchObject({
      width: "large",
      height: "large",
    });
    expect(
      reconciled.visual.layouts.lg.find(
        (item) => item.i === "trend-comparison",
      ),
    ).toMatchObject({ x: 0, y: 29, w: 8, h: 11 });
  });

  it("keeps independent width and height presets as metadata without resetting saved layouts", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        cards: {
          ...preferences.cards,
          summary: { visible: true, width: "small", height: "large" },
        },
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards.summary).toMatchObject({
      width: "small",
      height: "large",
    });
    expect(
      reconciled.visual.layouts.lg.find((item) => item.i === "summary"),
    ).toMatchObject({
      h: 7,
      maxH: 16,
      maxW: 12,
      minH: 6,
      minW: 3,
      w: 8,
    });
  });

  it("clamps invalid saved grid dimensions before preserving placement", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards,
      actions,
      "2026-06-28T00:00:00.000Z",
    );
    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        visual: {
          layouts: {
            ...preferences.visual.layouts,
            lg: [{ i: "summary", x: 11, y: 4, w: 20, h: 99 }],
          },
        },
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(
      reconciled.visual.layouts.lg.find((item) => item.i === "summary"),
    ).toMatchObject({
      x: 0,
      y: 4,
      w: 12,
      h: 16,
      minW: 3,
      minH: 6,
      maxW: 12,
      maxH: 16,
    });
  });

  it("reconciles removed and newly available cards and actions", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      cards.slice(0, -1),
      actions.slice(0, -1),
      "2026-06-28T00:00:00.000Z",
    );
    const withUnknowns = {
      ...preferences,
      cards: {
        ...preferences.cards,
        unknown: {
          visible: true,
          width: "small" as const,
          height: "small" as const,
        },
      },
      visual: {
        layouts: {
          ...preferences.visual.layouts,
          lg: [
            ...preferences.visual.layouts.lg,
            { i: "unknown", x: 0, y: 99, w: 1, h: 1 },
          ],
        },
      },
      board: {
        columns: {
          ...preferences.board.columns,
          done: ["unknown-action"],
        },
      },
    };

    const reconciled = reconcileDashboardPreferences(
      withUnknowns,
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(Object.keys(reconciled.cards)).toEqual(cards.map((card) => card.id));
    expect(
      reconciled.visual.layouts.lg.some((item) => item.i === "unknown"),
    ).toBe(false);
    expect(reconciled.visual.layouts.lg.map((item) => item.i)).toContain(
      cards.at(-1)?.id,
    );
    expect([...Object.values(reconciled.board.columns).flat()].sort()).toEqual(
      [...actions.map((action) => action.id)].sort(),
    );
  });

  it("preserves missing module chart preferences while removing other unknown cards", () => {
    const focusedDiagnosis = localDiagnosis(defaultCreatorId, "focused");
    const focusedViewModel = buildDashboardViewModel(focusedDiagnosis);
    const focusedCards = buildDashboardCards(
      focusedDiagnosis,
      focusedViewModel,
    );
    const focusedActions = buildDashboardActionCards(focusedDiagnosis);
    const completeDiagnosis = localDiagnosis(defaultCreatorId, "complete");
    const completeViewModel = buildDashboardViewModel(completeDiagnosis);
    const completeCards = buildDashboardCards(
      completeDiagnosis,
      completeViewModel,
    );
    const completeActions = buildDashboardActionCards(completeDiagnosis);
    const focusedCardIds = new Set(focusedCards.map((card) => card.id));
    const missingModuleChartCard = completeCards.find(
      (card) => card.kind === "module-chart" && !focusedCardIds.has(card.id),
    );

    expect(missingModuleChartCard).toBeDefined();

    const preferences = buildDefaultDashboardPreferences(
      defaultCreatorId,
      completeCards,
      completeActions,
      "2026-06-28T00:00:00.000Z",
    );
    const savedMissingLayout = {
      ...preferences.visual.layouts.lg.find(
        (item) => item.i === missingModuleChartCard?.id,
      )!,
      x: 9,
      y: 42,
    };
    const withMissingModuleChart = {
      ...preferences,
      cards: {
        ...preferences.cards,
        [missingModuleChartCard!.id]: {
          visible: false,
          width: "large" as const,
          height: "medium" as const,
        },
        unknown: {
          visible: true,
          width: "small" as const,
          height: "small" as const,
        },
      },
      visual: {
        layouts: {
          ...preferences.visual.layouts,
          lg: [
            ...preferences.visual.layouts.lg.filter(
              (item) => item.i !== missingModuleChartCard?.id,
            ),
            savedMissingLayout,
            { i: "unknown", x: 0, y: 99, w: 1, h: 1 },
          ],
        },
      },
    };

    const reconciled = reconcileDashboardPreferences(
      withMissingModuleChart,
      defaultCreatorId,
      focusedCards,
      focusedActions,
      "2026-06-29T00:00:00.000Z",
    );

    expect(reconciled.cards[missingModuleChartCard!.id]).toMatchObject({
      visible: false,
      width: "large",
      height: "medium",
    });
    expect(reconciled.cards.unknown).toBeUndefined();
    expect(
      reconciled.visual.layouts.lg.find(
        (item) => item.i === missingModuleChartCard?.id,
      ),
    ).toEqual(savedMissingLayout);
    expect(
      reconciled.visual.layouts.lg.some((item) => item.i === "unknown"),
    ).toBe(false);
  });
});
