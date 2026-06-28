import { memo } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";

import type { AskTarget, DashboardViewModel } from "../../types";
import { DashboardHeader } from "./DashboardHeader";
import { InsightsContentSection } from "./sections/InsightsContentSection";
import { MetricsSection } from "./sections/MetricsSection";
import { OverviewSection } from "./sections/OverviewSection";
import { TrendsActionsSection } from "./sections/TrendsActionsSection";

export const DashboardPage = memo(function DashboardPage({
  diagnosis,
  isLoadingDiagnosis,
  onAskAgent,
  onOpenAgent,
  viewModel
}: {
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onAskAgent: (target: AskTarget) => void;
  onOpenAgent: () => void;
  viewModel: DashboardViewModel;
}) {
  return (
    <section className="min-w-0 flex-1">
      <DashboardHeader diagnosis={diagnosis} isLoadingDiagnosis={isLoadingDiagnosis} onOpenAgent={onOpenAgent} />

      <div className="space-y-5 px-5 py-5 xl:px-7">
        <OverviewSection diagnosis={diagnosis} viewModel={viewModel} onAsk={onAskAgent} />
        <MetricsSection metricCards={viewModel.metricCards} onAsk={onAskAgent} />
        <InsightsContentSection diagnosis={diagnosis} viewModel={viewModel} onAsk={onAskAgent} />
        <TrendsActionsSection diagnosis={diagnosis} viewModel={viewModel} onAsk={onAskAgent} />
      </div>
    </section>
  );
});
