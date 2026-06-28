import { describe, expect, it } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardViewModel } from "./model";
import {
  buildDashboardActionCards,
  buildDashboardCards,
  buildDefaultDashboardPreferences,
  parseDashboardPreferences,
  pickNewestDashboardPreferences,
  reconcileDashboardPreferences
} from "./customization";

const buildFixture = () => {
  const diagnosis = localDiagnosis(defaultCreatorId);
  const viewModel = buildDashboardViewModel(diagnosis);
  const cards = buildDashboardCards(diagnosis, viewModel);
  const actions = buildDashboardActionCards(diagnosis);

  return { actions, cards, diagnosis, viewModel };
};

describe("dashboard customization", () => {
  it("builds stable default preferences", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2026-06-28T00:00:00.000Z");

    expect(preferences.selectedView).toBe("visual");
    expect(Object.keys(preferences.cards)).toEqual(cards.map((card) => card.id));
    expect(preferences.cards.summary).toMatchObject({ width: "large", height: "large" });
    expect(preferences.cards.insights).toMatchObject({ width: "medium", height: "medium" });
    expect(preferences.cards["trend-comparison"]).toMatchObject({ width: "large", height: "large" });
    expect(preferences.visual.layouts.lg.map((item) => item.i)).toEqual(cards.map((card) => card.id));
    expect(preferences.visual.layouts.lg.slice(0, 2)).toMatchObject([
      { i: "summary", x: 0, y: 0, w: 8, h: 11, minW: 3, minH: 6, maxW: 12, maxH: 16 },
      { i: "insights", x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxW: 12, maxH: 16 }
    ]);
    expect(preferences.visual.layouts.md.find((item) => item.i === "metric:views7d")).toMatchObject({
      w: 3,
      h: 5,
      minW: 2,
      minH: 5,
      maxW: 8,
      maxH: 16
    });
    expect(preferences.visual.layouts.sm.find((item) => item.i === "insights")).toMatchObject({
      w: 3,
      h: 7,
      minW: 3,
      minH: 6,
      maxW: 4,
      maxH: 16
    });
    expect(preferences.board.columns.today.length).toBeGreaterThan(0);
  });

  it("picks the newest saved preferences by updatedAt", () => {
    const { actions, cards } = buildFixture();
    const older = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2026-06-28T00:00:00.000Z");
    const newer = {
      ...older,
      selectedView: "table" as const,
      updatedAt: "2026-06-29T00:00:00.000Z"
    };

    expect(pickNewestDashboardPreferences(older, newer).selectedView).toBe("table");
    expect(pickNewestDashboardPreferences(newer, older).selectedView).toBe("table");
  });

  it("rejects invalid cached preferences", () => {
    expect(parseDashboardPreferences({ version: 0 })).toBeNull();
  });

  it("migrates legacy cached card sizes while preserving saved grid dimensions", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2026-06-28T00:00:00.000Z");
    const parsed = parseDashboardPreferences({
      ...preferences,
      cards: {
        ...preferences.cards,
        summary: { visible: true, size: "wide" },
        insights: { visible: true, size: "tall" },
        "metric:views": { visible: true, size: "sm" }
      },
      visual: {
        layouts: {
          ...preferences.visual.layouts,
          lg: [{ i: "summary", x: 1, y: 2, w: 7, h: 9, minW: 1, minH: 1 }]
        }
      }
    });

    expect(parsed?.cards.summary).toMatchObject({ width: "large", height: "medium" });
    expect(parsed?.cards.insights).toMatchObject({ width: "medium", height: "large" });
    expect(parsed?.cards["metric:views"]).toMatchObject({ width: "small", height: "small" });

    const reconciled = reconcileDashboardPreferences(parsed ?? preferences, defaultCreatorId, cards, actions, "2026-06-29T00:00:00.000Z");

    expect(reconciled.visual.layouts.lg.find((item) => item.i === "summary")).toMatchObject({ x: 1, y: 2, h: 9, w: 7, minH: 6, minW: 3 });
    expect(reconciled.visual.layouts.lg.find((item) => item.i === "insights")).toMatchObject({ h: 11, w: 4, minH: 6, minW: 3 });
  });

  it("keeps independent width and height presets as metadata without resetting saved layouts", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2026-06-28T00:00:00.000Z");
    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        cards: {
          ...preferences.cards,
          summary: { visible: true, width: "small", height: "large" }
        }
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z"
    );

    expect(reconciled.cards.summary).toMatchObject({ width: "small", height: "large" });
    expect(reconciled.visual.layouts.lg.find((item) => item.i === "summary")).toMatchObject({
      h: 11,
      maxH: 16,
      maxW: 12,
      minH: 6,
      minW: 3,
      w: 8
    });
  });

  it("clamps invalid saved grid dimensions without resetting valid layout placement", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(defaultCreatorId, cards, actions, "2026-06-28T00:00:00.000Z");
    const reconciled = reconcileDashboardPreferences(
      {
        ...preferences,
        visual: {
          layouts: {
            ...preferences.visual.layouts,
            lg: [{ i: "summary", x: 11, y: 4, w: 20, h: 99 }]
          }
        }
      },
      defaultCreatorId,
      cards,
      actions,
      "2026-06-29T00:00:00.000Z"
    );

    expect(reconciled.visual.layouts.lg.find((item) => item.i === "summary")).toMatchObject({
      x: 0,
      y: 4,
      w: 12,
      h: 16,
      minW: 3,
      minH: 6,
      maxW: 12,
      maxH: 16
    });
  });

  it("reconciles removed and newly available cards and actions", () => {
    const { actions, cards } = buildFixture();
    const preferences = buildDefaultDashboardPreferences(defaultCreatorId, cards.slice(0, -1), actions.slice(0, -1), "2026-06-28T00:00:00.000Z");
    const withUnknowns = {
      ...preferences,
      cards: {
        ...preferences.cards,
        unknown: { visible: true, width: "small" as const, height: "small" as const }
      },
      visual: {
        layouts: {
          ...preferences.visual.layouts,
          lg: [...preferences.visual.layouts.lg, { i: "unknown", x: 0, y: 99, w: 1, h: 1 }]
        }
      },
      board: {
        columns: {
          ...preferences.board.columns,
          done: ["unknown-action"]
        }
      }
    };

    const reconciled = reconcileDashboardPreferences(withUnknowns, defaultCreatorId, cards, actions, "2026-06-29T00:00:00.000Z");

    expect(Object.keys(reconciled.cards)).toEqual(cards.map((card) => card.id));
    expect(reconciled.visual.layouts.lg.some((item) => item.i === "unknown")).toBe(false);
    expect(reconciled.visual.layouts.lg.map((item) => item.i)).toContain(cards.at(-1)?.id);
    expect([...Object.values(reconciled.board.columns).flat()].sort()).toEqual([...actions.map((action) => action.id)].sort());
  });
});
