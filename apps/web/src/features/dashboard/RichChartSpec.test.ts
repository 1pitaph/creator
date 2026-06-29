import { describe, expect, it } from "vitest";
import type { ChartIntent, CreatorMetrics } from "@creator/data-contracts";

import {
  buildFunnelData,
  buildRadarData,
} from "../../../../../packages/charts/src/adapters/metricSeries";
import { buildFunnelConversionSpec } from "../../../../../packages/charts/src/styles/FunnelConversionChart/spec";
import {
  buildHeatmapCalendarSpec,
  getHeatmapCellColor,
} from "../../../../../packages/charts/src/styles/HeatmapCalendarChart/spec";
import { chartEvidenceColors } from "../../../../../packages/charts/src/theme/creatorChartTheme";

const metrics: CreatorMetrics = {
  summary: {
    views7d: 1286000,
    viewsChangePct: 18,
    completionRate: 0.46,
    interactionRate: 0.057,
    followerGain7d: 5180,
    followerConversionRate: 0.004,
    publishCount7d: 9,
    liveGmv7d: 486000,
    commerceConversionRate: 0.042,
  },
  history: [
    {
      date: "2026-06-21",
      views: 142000,
      completionRate: 0.43,
      interactionRate: 0.051,
      followerConversionRate: 0.0035,
      followersGained: 497,
      commerceConversionRate: 0.034,
      liveGmv: 52000,
    },
    {
      date: "2026-06-22",
      views: 168000,
      completionRate: 0.44,
      interactionRate: 0.053,
      followerConversionRate: 0.0037,
      followersGained: 622,
      commerceConversionRate: 0.037,
      liveGmv: 61000,
    },
    {
      date: "2026-06-23",
      views: 151000,
      completionRate: 0.42,
      interactionRate: 0.049,
      followerConversionRate: 0.0034,
      followersGained: 514,
      commerceConversionRate: 0.035,
      liveGmv: 57000,
    },
  ],
  topContents: [
    {
      id: "sd1",
      title: "换亲当天，她反手拿回继承权",
      views: 318000,
      completionRate: 0.52,
      interactionRate: 0.071,
      followerConversionRate: 0.0048,
      hook: "前 2 秒抛出身份反转和利益冲突",
      opportunity: "强反转女主题材流水抬升",
    },
  ],
};

describe("rich dashboard chart specs", () => {
  it("keeps the conversion funnel to real content stages", () => {
    const funnelData = buildFunnelData(metrics);
    const spec = buildFunnelConversionSpec(metrics) as {
      data?: Array<{
        values?: Array<{
          labelText: string;
          stage: string;
          stageColor: string;
        }>;
      }>;
      funnel?: {
        style?: { fill?: (datum: { stageColor?: string }) => string };
      };
      label?: {
        visible?: boolean;
        style?: { lineWidth?: number; stroke?: string };
        formatMethod?: (
          text: string,
          datum?: { labelText?: string; stage?: string; displayValue?: string },
        ) => string;
      };
    };
    const values = spec.data?.[0]?.values ?? [];

    expect(funnelData.map((item) => item.stage)).toEqual([
      "7 日播放",
      "有效完播",
      "互动行为",
      "新增粉丝",
    ]);
    expect(funnelData.map((item) => item.value)).toEqual(
      [...funnelData].map((item) => item.value).sort((a, b) => b - a),
    );
    expect(values.map((item) => item.stage)).toEqual(
      funnelData.map((item) => item.stage),
    );
    expect(values.map((item) => item.stageColor)).toEqual(
      chartEvidenceColors.funnelStages,
    );
    expect(values[1]?.labelText).toBe("有效完播 59.2万");
    expect(spec.funnel?.style?.fill?.(values[1] ?? {})).toBe(
      chartEvidenceColors.funnelStages[1],
    );
    expect(spec.label?.visible).toBe(true);
    expect(spec.label?.style).toMatchObject({
      lineWidth: 0,
      stroke: "transparent",
    });
    expect(spec.label?.formatMethod?.("有效完播 591560", values[1])).toBe(
      "有效完播 59.2万",
    );
  });

  it("builds a multi-lane heatmap with stable colors and original tooltip values", () => {
    const intent: ChartIntent = {
      style: "heatmap-calendar",
      title: "7 日指标冷热矩阵",
      metricKeys: ["views", "completionRate", "interactionRate"],
      unit: "mixed",
      timeRangeDays: 7,
    };
    const spec = buildHeatmapCalendarSpec(intent, metrics) as {
      cell?: {
        style?: { fill?: (datum: { normalizedValue?: number }) => string };
      };
      data?: Array<{ values?: Array<{ displayValue: string; lane: string }> }>;
      tooltip?: unknown;
    };
    const values = spec.data?.[0]?.values ?? [];

    expect(values).toHaveLength(
      metrics.history.length * intent.metricKeys.length,
    );
    expect(new Set(values.map((item) => item.lane))).toEqual(
      new Set(["播放", "完播率", "互动率"]),
    );
    expect(values.every((item) => item.displayValue)).toBe(true);
    expect(spec.tooltip).toBeDefined();
    expect(getHeatmapCellColor(90)).toBe("#0369a1");
    expect(spec.cell?.style?.fill?.({ normalizedValue: 10 })).toBe("#f0f9ff");
  });

  it("scores radar charts from the top content lift before falling back to summary", () => {
    const radarData = buildRadarData(metrics);
    const fallbackRadarData = buildRadarData({ ...metrics, topContents: [] });

    expect(radarData.map((item) => item.label)).toEqual([
      "爆款播放",
      "完播兑现",
      "互动触发",
      "转粉承接",
      "更新稳定",
    ]);
    expect(radarData[0]?.score).toBeGreaterThan(50);
    expect(fallbackRadarData[0]).toMatchObject({
      label: "播放增长",
      series: "当前账号",
    });
  });
});
