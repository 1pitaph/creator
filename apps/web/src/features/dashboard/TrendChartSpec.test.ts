import { describe, expect, it } from "vitest";
import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";

import { buildDualAxisTrendSpec } from "../../../../../packages/charts/src/styles/DualAxisTrendChart/spec";
import { buildMultiMetricTrendSpec } from "../../../../../packages/charts/src/styles/MultiMetricTrendChart/spec";

const metrics: CreatorMetrics = {
  summary: {
    views7d: 1286000,
    viewsChangePct: 12,
    completionRate: 0.46,
    interactionRate: 0.057,
    followerGain7d: 5180,
    followerConversionRate: 0.004,
    publishCount7d: 7,
    liveGmv7d: 486000,
    commerceConversionRate: 0.042,
  },
  history: [
    {
      date: "2026-06-21",
      views: 120000,
      completionRate: 0.42,
      interactionRate: 0.05,
      followerConversionRate: 0.003,
      followersGained: 700,
      liveGmv: 52000,
      commerceConversionRate: 0.038,
    },
    {
      date: "2026-06-22",
      views: 140000,
      completionRate: 0.46,
      interactionRate: 0.057,
      followerConversionRate: 0.004,
      followersGained: 820,
      liveGmv: 61000,
      commerceConversionRate: 0.041,
    },
    {
      date: "2026-06-23",
      views: 132000,
      completionRate: 0.5,
      interactionRate: 0.06,
      followerConversionRate: 0.0042,
      followersGained: 880,
      liveGmv: 57000,
      commerceConversionRate: 0.04,
    },
  ],
  topContents: [],
};

describe("compact trend chart specs", () => {
  it("tightens multi-metric chart padding and legend spacing", () => {
    const intent: ChartIntent = {
      style: "multi-metric-trend",
      title: "播放与内容质量趋势",
      metricKeys: ["views", "completionRate", "interactionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    };
    const spec = buildMultiMetricTrendSpec(intent, metrics, true) as {
      axes?: Array<Record<string, unknown>>;
      legends?: Record<string, unknown>;
      padding?: unknown;
    };

    expect(spec.padding).toEqual({ top: 2, right: 4, bottom: 24, left: 32 });
    expect(spec.axes?.[0]).toMatchObject({
      trimPadding: true,
      bandPadding: 0,
      paddingInner: 0,
      paddingOuter: 0,
    });
    expect(spec.legends).toMatchObject({
      padding: { top: 0 },
      maxRow: 1,
      item: { height: 18 },
    });
  });

  it("binds dual-axis compact charts to separate axes with short labels", () => {
    const intent: ChartIntent = {
      style: "dual-axis-trend",
      title: "流水与转化趋势",
      metricKeys: ["liveGmv", "commerceConversionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    };
    const spec = buildDualAxisTrendSpec(intent, metrics, true) as {
      axes?: Array<Record<string, any>>;
      padding?: unknown;
      series?: Array<Record<string, any>>;
    };

    expect(spec.padding).toEqual({ top: 2, right: 28, bottom: 24, left: 34 });
    expect(spec.series?.[0]).toMatchObject({ type: "bar", dataIndex: 0 });
    expect(spec.series?.[1]).toMatchObject({ type: "line", dataIndex: 1 });
    expect(spec.axes?.[0]).toMatchObject({
      trimPadding: true,
      bandPadding: 0,
      paddingInner: 0,
      paddingOuter: 0,
    });
    expect(spec.axes?.[1]).toMatchObject({ seriesIndex: [0], zero: true });
    expect(spec.axes?.[2]).toMatchObject({ seriesIndex: [1], zero: false });
    expect(spec.axes?.[1]?.label.formatMethod("100000")).toBe("10万");
    expect(spec.axes?.[2]?.label.formatMethod("0.042")).toBe("4.2%");
  });
});
