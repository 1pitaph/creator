import { memo, useMemo, useState } from "react";

import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { FloppyDisk } from "@phosphor-icons/react/FloppyDisk";
import { Kanban } from "@phosphor-icons/react/Kanban";
import { PencilSimpleLine } from "@phosphor-icons/react/PencilSimpleLine";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";
import { Table } from "@phosphor-icons/react/Table";

import type { DashboardView, DiagnosisResponse } from "@creator/data-contracts";
import { Button, cn } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";
import type { AskTarget, DashboardViewModel } from "../../types";
import {
  buildDashboardActionCards,
  buildDashboardCards,
} from "./customization";
import { DashboardHeader } from "./DashboardHeader";
import { useDashboardPreferences } from "./useDashboardPreferences";
import { BoardDashboardView } from "./views/BoardDashboardView";
import { TableDashboardView } from "./views/TableDashboardView";
import { VisualDashboardView } from "./views/VisualDashboardView";

const viewOptions: Array<{
  icon: typeof SquaresFour;
  label: string;
  value: DashboardView;
}> = [
  { icon: SquaresFour, label: "Visual", value: "visual" },
  { icon: Kanban, label: "Board", value: "board" },
  { icon: Table, label: "Table", value: "table" },
];

export const DashboardPage = memo(function DashboardPage({
  creatorId,
  diagnosis,
  isLoadingDiagnosis,
  onAskAgent,
  viewModel,
}: {
  creatorId: string;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onAskAgent: (target: AskTarget) => void;
  viewModel: DashboardViewModel;
}) {
  const [editing, setEditing] = useState(false);
  const cards = useMemo(
    () => buildDashboardCards(diagnosis, viewModel),
    [diagnosis, viewModel],
  );
  const actions = useMemo(
    () => buildDashboardActionCards(diagnosis),
    [diagnosis],
  );
  const { preferences, resetPreferences, updatePreferences } =
    useDashboardPreferences({
      actions,
      cards,
      creatorId,
    });

  return (
    <section className="min-w-0 flex-1">
      <DashboardHeader
        diagnosis={diagnosis}
        isLoadingDiagnosis={isLoadingDiagnosis}
      />

      <div className="space-y-5 px-5 py-5 xl:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-white p-1 shadow-[0_1px_1px_rgba(24,24,27,0.025),0_6px_18px_rgba(24,24,27,0.04)]">
            {viewOptions.map(({ icon: Icon, label, value }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
                  preferences.selectedView === value
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                )}
                onClick={() =>
                  updatePreferences((current) => ({
                    ...current,
                    selectedView: value,
                  }))
                }
              >
                <Icon className="h-4 w-4" weight={phosphorIconWeight} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resetPreferences}
            >
              <ArrowCounterClockwise
                className="h-4 w-4"
                weight={phosphorIconWeight}
              />
              重置
            </Button>
            <Button
              type="button"
              variant={editing ? "primary" : "secondary"}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? (
                <FloppyDisk className="h-4 w-4" weight={phosphorIconWeight} />
              ) : (
                <PencilSimpleLine
                  className="h-4 w-4"
                  weight={phosphorIconWeight}
                />
              )}
              {editing ? "完成" : "编辑"}
            </Button>
          </div>
        </div>

        {preferences.selectedView === "visual" ? (
          <VisualDashboardView
            actions={actions}
            cards={cards}
            diagnosis={diagnosis}
            editing={editing}
            onAsk={onAskAgent}
            preferences={preferences}
            updatePreferences={updatePreferences}
            viewModel={viewModel}
          />
        ) : null}

        {preferences.selectedView === "board" ? (
          <BoardDashboardView
            actions={actions}
            editing={editing}
            preferences={preferences}
            updatePreferences={updatePreferences}
          />
        ) : null}

        {preferences.selectedView === "table" ? (
          <TableDashboardView
            cards={cards}
            preferences={preferences}
            updatePreferences={updatePreferences}
          />
        ) : null}
      </div>
    </section>
  );
});
