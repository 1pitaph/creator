import { describe, expect, it } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { formatCompact, formatPct } from "../../lib/format";
import { buildDashboardViewModel, calculateHealthScore } from "./model";

describe("dashboard view model", () => {
  it("builds stable dashboard data from a diagnosis", () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const viewModel = buildDashboardViewModel(diagnosis);

    expect(calculateHealthScore(diagnosis)).toBeGreaterThanOrEqual(42);
    expect(viewModel.healthScore).toBe(calculateHealthScore(diagnosis));
    expect(viewModel.activeModuleIds).toEqual(
      diagnosis.modules.map((module) => module.id),
    );
    expect(viewModel.metricCards.map((metric) => metric.id)).toContain(
      "views7d",
    );
    expect(viewModel.trendComparisonChart).toMatchObject({
      style: "heatmap-calendar",
      metricKeys: [
        "views",
        "completionRate",
        "interactionRate",
        "followerConversionRate",
      ],
    });
    expect(
      viewModel.metricCards.find((metric) => metric.id === "commerce")
        ?.chartIntent,
    ).toMatchObject({
      style: "dual-axis-trend",
      metricKeys: ["liveGmv", "commerceConversionRate"],
      unit: "mixed",
    });
    expect(viewModel.metricCards[0]?.askTarget.moduleId).toBe(
      "content-diagnosis",
    );
    expect(viewModel.moduleById.get(diagnosis.modules[0]!.id)).toBe(
      diagnosis.modules[0],
    );
    expect(viewModel.actionQueue).toHaveLength(
      Math.min(
        4,
        diagnosis.insights.flatMap((insight) => insight.actions).length,
      ),
    );
  });

  it("keeps formatter behavior available for extracted model code", () => {
    expect(formatCompact(123456)).toMatch(/12\.3万|123\.5K|123\.5千/);
    expect(formatPct(0.456)).toBe("45.6%");
  });
});
