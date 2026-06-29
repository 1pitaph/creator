import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { localDiagnosis } from "../../creator-diagnosis/api";
import { defaultCreatorId } from "../../creator-diagnosis/creatorOptions";
import { buildDashboardViewModel } from "../model";
import { TrendsActionsSection } from "./TrendsActionsSection";

const chartSlotMock = vi.hoisted(() => vi.fn());

vi.mock("@creator/charts", () => ({
  ChartSlot: (props: {
    compact?: boolean;
    height?: number | string;
    intent: { title: string };
  }) => {
    chartSlotMock(props);

    return (
      <div
        data-compact={String(props.compact ?? false)}
        data-height={String(props.height ?? "")}
        data-testid="chart-slot"
        data-title={props.intent.title}
      />
    );
  },
}));

describe("TrendsActionsSection", () => {
  it("renders one trend chart and replaces duplicate mini charts with summaries", () => {
    const diagnosis = localDiagnosis(defaultCreatorId, "focused");
    const viewModel = buildDashboardViewModel(diagnosis);

    render(
      <TrendsActionsSection
        diagnosis={diagnosis}
        onAsk={vi.fn()}
        viewModel={viewModel}
      />,
    );

    expect(screen.getAllByTestId("chart-slot")).toHaveLength(1);
    expect(chartSlotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        compact: true,
        height: 260,
        intent: viewModel.trendComparisonChart,
      }),
    );

    viewModel.metricCards.slice(0, 4).forEach((metric) => {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    });
  });
});
