import { describe, expect, it } from "vitest";
import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";

import { buildMiniTrendSpec } from "../../../../../packages/charts/src/styles/MiniTrendChart/spec";

const intent: ChartIntent = {
  style: "mini-trend",
  title: "7 日播放趋势",
  metricKeys: ["views"],
  unit: "count",
  timeRangeDays: 7
};

const metrics: CreatorMetrics = {
  summary: {
    views7d: 1286000,
    viewsChangePct: 12,
    completionRate: 0.46,
    interactionRate: 0.057,
    followerGain7d: 5180,
    followerConversionRate: 0.004,
    publishCount7d: 7
  },
  history: [
    {
      date: "2026-06-01",
      views: 120000,
      completionRate: 0.42,
      interactionRate: 0.05,
      followerConversionRate: 0.003,
      followersGained: 700
    },
    {
      date: "2026-06-02",
      views: 140000,
      completionRate: 0.46,
      interactionRate: 0.057,
      followerConversionRate: 0.004,
      followersGained: 820
    }
  ],
  topContents: []
};

describe("buildMiniTrendSpec", () => {
  it("hides both compact axes explicitly", () => {
    const spec = buildMiniTrendSpec(intent, metrics) as { axes?: unknown };

    expect(spec.axes).toMatchObject([
      {
        orient: "bottom",
        type: "band",
        visible: false,
        label: { visible: false },
        tick: { visible: false },
        domainLine: { visible: false },
        grid: { visible: false }
      },
      {
        orient: "left",
        type: "linear",
        visible: false,
        label: { visible: false },
        tick: { visible: false },
        domainLine: { visible: false },
        grid: { visible: false }
      }
    ]);
  });

  it("uses stable compact layout settings", () => {
    const spec = buildMiniTrendSpec(intent, metrics) as { animation?: unknown; padding?: unknown };

    expect(spec.padding).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
    expect(spec.animation).toBe(false);
  });
});
