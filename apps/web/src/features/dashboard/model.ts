import type { ChartIntent, DiagnosisResponse } from "@creator/data-contracts";

import { clamp } from "../../lib/math";
import { formatCompact, formatCurrency, formatPct } from "../../lib/format";
import type { DashboardViewModel, MetricDefinition } from "../../types";

export const calculateHealthScore = (diagnosis: DiagnosisResponse) => {
  const metrics = diagnosis.metrics.summary;

  return clamp(
    Math.round(
      68 +
        metrics.viewsChangePct * 0.22 +
        metrics.completionRate * 22 +
        metrics.interactionRate * 120 +
        metrics.followerConversionRate * 420
    ),
    42,
    96
  );
};

export const buildMetricCards = (diagnosis: DiagnosisResponse): MetricDefinition[] => {
  const metrics = diagnosis.metrics.summary;
  const topContent = diagnosis.metrics.topContents[0];
  const metricCards: MetricDefinition[] = [
    {
      id: "views7d",
      label: "7 日播放",
      value: formatCompact(metrics.views7d),
      helper: `较前期 ${metrics.viewsChangePct > 0 ? "+" : ""}${metrics.viewsChangePct}%`,
      tone: "sky",
      trendLabel: metrics.viewsChangePct > 0 ? "上升" : metrics.viewsChangePct < 0 ? "下降" : "稳定",
      trend: metrics.viewsChangePct > 0 ? "up" : metrics.viewsChangePct < 0 ? "down" : "flat",
      chartIntent: {
        style: "mini-trend",
        title: "7 日播放趋势",
        metricKeys: ["views"],
        unit: "count",
        timeRangeDays: 7
      },
      askTarget: {
        title: "7 日播放",
        moduleId: "content-diagnosis",
        prompt: `请分析「${diagnosis.creator.displayName}」的 7 日播放数据，解释播放变化 ${metrics.viewsChangePct}% 的原因，并给出下一条内容怎么调整。`,
        summary: `7 日播放 ${formatCompact(metrics.views7d)}，较前期 ${metrics.viewsChangePct > 0 ? "+" : ""}${metrics.viewsChangePct}%`,
        evidence: diagnosis.metrics.history.map((item) => `${item.date}: ${formatCompact(item.views)}`).slice(-3)
      }
    },
    {
      id: "completionRate",
      label: "完播率",
      value: formatPct(metrics.completionRate),
      helper: "衡量内容兑现能力",
      tone: "emerald",
      trendLabel: metrics.completionRate >= 0.45 ? "健康" : "待修复",
      trend: metrics.completionRate >= 0.45 ? "up" : "down",
      chartIntent: {
        style: "mini-trend",
        title: "完播率趋势",
        metricKeys: ["completionRate"],
        unit: "percent",
        timeRangeDays: 7
      },
      askTarget: {
        title: "完播率",
        moduleId: "content-diagnosis",
        prompt: `请只围绕完播率分析「${diagnosis.creator.displayName}」的问题：当前完播率 ${formatPct(metrics.completionRate)}，应该如何优化前 5 秒和内容结构？`,
        summary: `当前完播率 ${formatPct(metrics.completionRate)}`,
        evidence: topContent ? [`高表现内容：${topContent.title}`, `Hook：${topContent.hook}`] : []
      }
    },
    {
      id: "interactionRate",
      label: "互动率",
      value: formatPct(metrics.interactionRate),
      helper: "评论、赞藏、分享综合",
      tone: "amber",
      trendLabel: metrics.interactionRate >= 0.06 ? "活跃" : "可提升",
      trend: metrics.interactionRate >= 0.06 ? "up" : "flat",
      chartIntent: {
        style: "mini-trend",
        title: "互动率趋势",
        metricKeys: ["interactionRate"],
        unit: "percent",
        timeRangeDays: 7
      },
      askTarget: {
        title: "互动率",
        moduleId: "fan-operation",
        prompt: `请分析互动率模块：当前互动率 ${formatPct(metrics.interactionRate)}，结合受众结构给出评论区和选题互动设计。`,
        summary: `当前互动率 ${formatPct(metrics.interactionRate)}`,
        evidence: diagnosis.creator.audience.map((item) => `${item.label} ${item.percentage}%`)
      }
    },
    {
      id: "followerGain7d",
      label: "7 日涨粉",
      value: formatCompact(metrics.followerGain7d),
      helper: `转粉率 ${formatPct(metrics.followerConversionRate)}`,
      tone: "rose",
      trendLabel: metrics.followerConversionRate >= 0.006 ? "承接中" : "弱承接",
      trend: metrics.followerConversionRate >= 0.006 ? "up" : "down",
      chartIntent: {
        style: "mini-trend",
        title: "新增粉丝趋势",
        metricKeys: ["followersGained"],
        unit: "count",
        timeRangeDays: 7
      },
      askTarget: {
        title: "7 日涨粉",
        moduleId: "fan-operation",
        prompt: `请分析「${diagnosis.creator.displayName}」涨粉和转粉承接。当前 7 日涨粉 ${metrics.followerGain7d}，转粉率 ${formatPct(metrics.followerConversionRate)}，怎么提升关注理由？`,
        summary: `7 日涨粉 ${formatCompact(metrics.followerGain7d)}，转粉率 ${formatPct(metrics.followerConversionRate)}`,
        evidence: diagnosis.creator.bottlenecks
      }
    }
  ];

  if (typeof metrics.liveGmv7d === "number" || typeof metrics.commerceConversionRate === "number") {
    metricCards.push({
      id: "commerce",
      label: diagnosis.creator.creatorType === "short_drama_strategy" ? "短剧收益" : "商业化承接",
      value: typeof metrics.liveGmv7d === "number" ? formatCurrency(metrics.liveGmv7d) : formatPct(metrics.commerceConversionRate ?? 0),
      helper: `收益转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}`,
      tone: "violet",
      trendLabel: "可优化",
      trend: "up",
      chartIntent: {
        style: "mini-trend",
        title: "商业化承接趋势",
        metricKeys: typeof metrics.liveGmv7d === "number" ? ["liveGmv"] : ["commerceConversionRate"],
        unit: typeof metrics.liveGmv7d === "number" ? "currency" : "percent",
        timeRangeDays: 7
      },
      askTarget: {
        title: diagnosis.creator.creatorType === "short_drama_strategy" ? "短剧收益" : "商业化承接",
        moduleId: "drama-revenue-radar",
        prompt: `请分析收益承接：7 日流水 ${metrics.liveGmv7d ?? 0}，收益转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}，下一轮选题应该优先看哪些题材和内容结构？`,
        summary: `流水 ${metrics.liveGmv7d ? formatCurrency(metrics.liveGmv7d) : "暂无"}，收益转化率 ${formatPct(metrics.commerceConversionRate ?? 0)}`,
        evidence: topContent ? [topContent.opportunity] : []
      }
    });
  }

  return metricCards;
};

export const buildTrendComparisonChart = (): ChartIntent => ({
  style: "multi-metric-trend",
  title: "7 日趋势对照",
  description: "播放、完播、互动和转粉趋势对照",
  metricKeys: ["views", "completionRate", "interactionRate", "followerConversionRate"],
  unit: "mixed",
  timeRangeDays: 7
});

export const buildDashboardViewModel = (diagnosis: DiagnosisResponse): DashboardViewModel => ({
  activeModuleIds: diagnosis.modules.map((module) => module.id),
  actionQueue: diagnosis.insights
    .flatMap((insight) => insight.actions.map((action) => ({ ...action, moduleId: insight.moduleId, insightTitle: insight.title })))
    .slice(0, 4),
  healthScore: calculateHealthScore(diagnosis),
  metricCards: buildMetricCards(diagnosis),
  metrics: diagnosis.metrics,
  moduleById: new Map(diagnosis.modules.map((module) => [module.id, module])),
  trendComparisonChart: buildTrendComparisonChart(),
  topContent: diagnosis.metrics.topContents[0],
  topInsight: diagnosis.insights.find((insight) => insight.severity === "warning") ?? diagnosis.insights[0]
});
