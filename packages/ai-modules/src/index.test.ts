import { describe, expect, it } from "vitest";

import { mockCreators } from "@creator/mock-data";

import { createDiagnosis } from "./index";

const diagnosisFor = (
  creatorId: string,
  moduleLoadMode: "focused" | "complete" | "adaptive",
) => {
  const creator = mockCreators.find(({ profile }) => profile.id === creatorId);

  if (!creator) {
    throw new Error(`Missing mock creator: ${creatorId}`);
  }

  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics,
    moduleLoadMode,
  });
};

const moduleIdsFor = (
  creatorId: string,
  moduleLoadMode: "focused" | "complete" | "adaptive",
) => diagnosisFor(creatorId, moduleLoadMode).modules.map((module) => module.id);

describe("AI module routing", () => {
  it("loads focused modules for the five interview-led creator types", () => {
    expect(moduleIdsFor("short-drama-strategy", "focused")).toEqual([
      "drama-revenue-radar",
      "viral-review",
      "content-diagnosis",
      "fan-operation",
    ]);
    expect(moduleIdsFor("personal-daily-diagnosis", "focused")).toEqual([
      "traffic-anomaly",
      "content-diagnosis",
      "tag-risk-explainer",
      "publishing-cadence",
    ]);
    expect(moduleIdsFor("growth-review", "focused")).toEqual([
      "viral-review",
      "fan-operation",
      "content-diagnosis",
      "traffic-anomaly",
    ]);
    expect(moduleIdsFor("plateau-repair", "focused")).toEqual([
      "plateau-experiment",
      "traffic-anomaly",
      "content-diagnosis",
      "publishing-cadence",
    ]);
    expect(moduleIdsFor("series-operation", "focused")).toEqual([
      "series-operation",
      "fan-operation",
      "viral-review",
      "publishing-cadence",
    ]);
  });

  it("expands complete mode beyond focused mode for type-relevant modules", () => {
    const focused = moduleIdsFor("personal-daily-diagnosis", "focused");
    const complete = moduleIdsFor("personal-daily-diagnosis", "complete");

    expect(complete).toEqual(expect.arrayContaining(focused));
    expect(complete.length).toBeGreaterThan(focused.length);
  });

  it("orders adaptive mode by current signals and keeps the mode on the response", () => {
    const diagnosis = diagnosisFor("plateau-repair", "adaptive");

    expect(diagnosis.moduleLoadMode).toBe("adaptive");
    expect(diagnosis.modules[0]?.id).toBe("plateau-experiment");
    expect(diagnosis.modules.map((module) => module.id)).toContain(
      "plateau-experiment",
    );
  });

  it("maps focused modules to evidence-specific chart families", () => {
    const chartStyleByModuleId = Object.fromEntries(
      [
        "short-drama-strategy",
        "personal-daily-diagnosis",
        "plateau-repair",
      ].flatMap((creatorId) =>
        diagnosisFor(creatorId, "complete").modules.map((module) => [
          module.id,
          module.chart?.style,
        ]),
      ),
    );

    expect(chartStyleByModuleId).toMatchObject({
      "content-diagnosis": "funnel-conversion",
      "drama-revenue-radar": "dual-axis-trend",
      "fan-operation": "dual-axis-trend",
      "plateau-experiment": "heatmap-calendar",
      "traffic-anomaly": "heatmap-calendar",
      "viral-review": "radar-score",
    });
    expect(chartStyleByModuleId["tag-risk-explainer"]).toBeUndefined();
  });
});
