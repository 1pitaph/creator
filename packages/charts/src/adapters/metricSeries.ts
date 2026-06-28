import type { ChartIntent, CreatorMetrics, MetricPoint, MetricSeriesKey } from "@creator/data-contracts";

import type { ChartDatum } from "../types";

type MetricMeta = {
  label: string;
  unit: "count" | "percent" | "currency";
  getValue: (point: MetricPoint) => number | undefined;
};

export const metricMeta: Record<MetricSeriesKey, MetricMeta> = {
  views: {
    label: "播放",
    unit: "count",
    getValue: (point) => point.views
  },
  completionRate: {
    label: "完播率",
    unit: "percent",
    getValue: (point) => point.completionRate
  },
  interactionRate: {
    label: "互动率",
    unit: "percent",
    getValue: (point) => point.interactionRate
  },
  followerConversionRate: {
    label: "转粉率",
    unit: "percent",
    getValue: (point) => point.followerConversionRate
  },
  followersGained: {
    label: "新增粉丝",
    unit: "count",
    getValue: (point) => point.followersGained
  },
  commerceConversionRate: {
    label: "商品转化率",
    unit: "percent",
    getValue: (point) => point.commerceConversionRate
  },
  liveGmv: {
    label: "GMV",
    unit: "currency",
    getValue: (point) => point.liveGmv
  }
};

const compactFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "CNY"
});

export const formatChartValue = (value: number, unit: ChartDatum["unit"]) => {
  if (unit === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (unit === "currency") {
    return currencyFormatter.format(value);
  }

  return compactFormatter.format(value);
};

const normalize = (value: number, values: number[]) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  if (range === 0) {
    return 50;
  }

  return ((value - min) / range) * 100;
};

export const buildChartSeries = (intent: ChartIntent, metrics: CreatorMetrics): ChartDatum[] => {
  const selectedHistory = intent.timeRangeDays ? metrics.history.slice(-intent.timeRangeDays) : metrics.history;

  return intent.metricKeys.flatMap((key) => {
    const meta = metricMeta[key];
    const rawValues = selectedHistory
      .map((point) => meta.getValue(point))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    return selectedHistory.flatMap((point) => {
      const value = meta.getValue(point);

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return [];
      }

      return [
        {
          date: point.date,
          key,
          label: meta.label,
          value,
          normalizedValue: normalize(value, rawValues),
          displayValue: formatChartValue(value, meta.unit),
          unit: meta.unit
        }
      ];
    });
  });
};

export const buildFunnelData = (metrics: CreatorMetrics) => {
  const views = metrics.summary.views7d;
  const completedViews = Math.round(views * metrics.summary.completionRate);
  const interactions = Math.round(views * metrics.summary.interactionRate);
  const followers = metrics.summary.followerGain7d;
  const commerce = Math.round(views * (metrics.summary.commerceConversionRate ?? 0));

  return [
    { stage: "7 日播放", value: views, displayValue: formatChartValue(views, "count") },
    { stage: "有效完播", value: completedViews, displayValue: formatChartValue(completedViews, "count") },
    { stage: "互动行为", value: interactions, displayValue: formatChartValue(interactions, "count") },
    { stage: "新增粉丝", value: followers, displayValue: formatChartValue(followers, "count") },
    ...(commerce > 0 ? [{ stage: "成交线索", value: commerce, displayValue: formatChartValue(commerce, "count") }] : [])
  ];
};

export const buildRadarData = (metrics: CreatorMetrics) => {
  const summary = metrics.summary;
  const viewGrowthScore = Math.max(0, Math.min(100, 50 + summary.viewsChangePct));

  return [
    { label: "播放增长", series: "当前账号", score: viewGrowthScore },
    { label: "完播", series: "当前账号", score: Math.min(100, summary.completionRate * 160) },
    { label: "互动", series: "当前账号", score: Math.min(100, summary.interactionRate * 1000) },
    { label: "转粉", series: "当前账号", score: Math.min(100, summary.followerConversionRate * 10000) },
    { label: "更新稳定", series: "当前账号", score: Math.min(100, (summary.publishCount7d / 7) * 100) }
  ];
};
