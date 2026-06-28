import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleLoadMode } from "@creator/data-contracts";

import { localDiagnosis } from "../../creator-diagnosis/api";
import { defaultCreatorId } from "../../creator-diagnosis/creatorOptions";
import {
  buildDashboardActionCards,
  buildDashboardCards,
} from "../customization";
import { buildDashboardViewModel } from "../model";
import { DashboardCardRenderer } from "./DashboardCardRenderer";

const chartSlotMock = vi.hoisted(() => vi.fn());

vi.mock("@creator/charts", () => ({
  ChartSlot: (props: { compact?: boolean; height?: number | string; intent: { title: string } }) => {
    chartSlotMock(props);

    return <div data-compact={String(props.compact ?? false)} data-height={String(props.height ?? "")} data-testid="chart-slot" data-title={props.intent.title} />;
  }
}));

const renderInsightsCard = (moduleLoadMode: ModuleLoadMode = "focused") => {
  const diagnosis = localDiagnosis(defaultCreatorId, moduleLoadMode);
  const viewModel = buildDashboardViewModel(diagnosis);
  const card = buildDashboardCards(diagnosis, viewModel).find(
    (item) => item.id === "insights",
  );
  const onAsk = vi.fn();

  if (!card) {
    throw new Error("Missing insights card definition");
  }

  const view = render(
    <DashboardCardRenderer
      actions={buildDashboardActionCards(diagnosis)}
      card={card}
      diagnosis={diagnosis}
      fill
      onAsk={onAsk}
      size={card.defaultSize}
      viewModel={viewModel}
    />,
  );

  return { card, diagnosis, onAsk, view };
};

const createInsightsCard = (moduleLoadMode: ModuleLoadMode = "focused") => {
  const diagnosis = localDiagnosis(defaultCreatorId, moduleLoadMode);
  const viewModel = buildDashboardViewModel(diagnosis);
  const card = buildDashboardCards(diagnosis, viewModel).find(
    (item) => item.id === "insights",
  );

  if (!card) {
    throw new Error("Missing insights card definition");
  }

  return (
    <DashboardCardRenderer
      actions={buildDashboardActionCards(diagnosis)}
      card={card}
      diagnosis={diagnosis}
      fill
      onAsk={vi.fn()}
      size={card.defaultSize}
      viewModel={viewModel}
    />
  );
};

beforeEach(() => {
  chartSlotMock.mockClear();
});

describe("DashboardCardRenderer insights pagination", () => {
  it("shows one insight page at a time with accessible boundaries", () => {
    const { diagnosis } = renderInsightsCard();
    const firstInsight = diagnosis.insights[0];
    const secondInsight = diagnosis.insights[1];

    expect(firstInsight).toBeDefined();
    expect(secondInsight).toBeDefined();
    expect(screen.getByText(firstInsight!.title)).toBeInTheDocument();
    expect(screen.queryByText(secondInsight!.title)).not.toBeInTheDocument();

    const previousButton = screen.getByRole("button", {
      name: "上一条 AI 诊断优先级",
    });
    const nextButton = screen.getByRole("button", {
      name: "下一条 AI 诊断优先级",
    });

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      `第 1 / ${diagnosis.insights.length} 条`,
    );

    fireEvent.click(nextButton);

    expect(screen.getByText(secondInsight!.title)).toBeInTheDocument();
    expect(screen.queryByText(firstInsight!.title)).not.toBeInTheDocument();
    expect(previousButton).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      `第 2 / ${diagnosis.insights.length} 条`,
    );
  });

  it("supports keyboard paging and disables next on the last page", async () => {
    const user = userEvent.setup();
    const { diagnosis } = renderInsightsCard();
    const lastInsight = diagnosis.insights.at(-1);
    const nextButton = screen.getByRole("button", {
      name: "下一条 AI 诊断优先级",
    });

    expect(lastInsight).toBeDefined();

    nextButton.focus();

    for (let index = 1; index < diagnosis.insights.length; index += 1) {
      await user.keyboard("{Enter}");
    }

    expect(screen.getByText(lastInsight!.title)).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      `第 ${diagnosis.insights.length} / ${diagnosis.insights.length} 条`,
    );
  });

  it("asks AI about the insight on the current page", () => {
    const { diagnosis, onAsk } = renderInsightsCard();
    const secondInsight = diagnosis.insights[1];

    expect(secondInsight).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "下一条 AI 诊断优先级" }),
    );
    fireEvent.click(
      screen.getByLabelText(`询问 AI Agent：${secondInsight!.title}`),
    );

    expect(onAsk).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: secondInsight!.moduleId,
        title: secondInsight!.title,
      }),
    );
  });

  it("clamps the selected page when the insight count shrinks", async () => {
    const diagnosis = localDiagnosis(defaultCreatorId, "focused");
    const { rerender } = render(createInsightsCard("complete"));
    const nextButton = screen.getByRole("button", {
      name: "下一条 AI 诊断优先级",
    });

    while (!nextButton.hasAttribute("disabled")) {
      fireEvent.click(nextButton);
    }

    rerender(createInsightsCard("focused"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        `第 ${diagnosis.insights.length} / ${diagnosis.insights.length} 条`,
      );
    });
  });
});

describe("DashboardCardRenderer module chart cards", () => {
  it("renders a standalone module chart once and asks about that module", () => {
    const diagnosis = localDiagnosis(defaultCreatorId, "focused");
    const viewModel = buildDashboardViewModel(diagnosis);
    const module = diagnosis.modules.find((item) => item.chart);
    const card = buildDashboardCards(diagnosis, viewModel).find((item) => item.id === `module-chart:${module?.id}`);
    const onAsk = vi.fn();

    expect(module).toBeDefined();
    expect(card).toBeDefined();

    render(
      <DashboardCardRenderer
        actions={buildDashboardActionCards(diagnosis)}
        card={card!}
        diagnosis={diagnosis}
        fill
        onAsk={onAsk}
        size={card!.defaultSize}
        viewModel={viewModel}
      />
    );

    expect(screen.getByRole("heading", { name: module!.chart!.title })).toBeInTheDocument();
    expect(screen.getByTestId("chart-slot")).toHaveAttribute("data-title", module!.chart!.title);
    expect(screen.getByTestId("chart-slot")).toHaveAttribute("data-height", "min(100%, 360px)");
    expect(chartSlotMock).toHaveBeenCalledTimes(1);
    expect(chartSlotMock).toHaveBeenCalledWith(expect.objectContaining({ intent: module!.chart, compact: false }));

    fireEvent.click(screen.getByLabelText(`询问 AI Agent：${module!.name} · ${module!.chart!.title}`));

    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ moduleId: module!.id, title: `${module!.name} · ${module!.chart!.title}` }));
  });
});
