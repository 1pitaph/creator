import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { FloppyDisk } from "@phosphor-icons/react/FloppyDisk";
import { Kanban } from "@phosphor-icons/react/Kanban";
import { PencilSimpleLine } from "@phosphor-icons/react/PencilSimpleLine";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";
import { Table } from "@phosphor-icons/react/Table";

import type { DashboardView, DiagnosisResponse } from "@creator/data-contracts";
import { Button, cn } from "@creator/ui";

import { AuroraBackground } from "../../components/effects/AuroraBackground";
import { phosphorIconWeight } from "../../constants";
import type { AskTarget, DashboardViewModel } from "../../types";
import {
  buildDashboardActionCards,
  buildDashboardCards,
} from "./customization";
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

const viewIndicatorTransition =
  "transition-[transform,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none";

export const DashboardPage = memo(function DashboardPage({
  creatorId,
  diagnosis,
  onAskAgent,
  viewModel,
}: {
  creatorId: string;
  diagnosis: DiagnosisResponse;
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
  const handleViewChange = useCallback(
    (view: DashboardView) => {
      if (view !== "board") {
        setEditing(false);
      }

      updatePreferences((current) => ({
        ...current,
        selectedView: view,
      }));
    },
    [updatePreferences],
  );

  return (
    <section className="min-w-0 flex-1">
      <AuroraBackground>
        <div className="space-y-5 px-5 py-5 xl:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DashboardViewSwitcher
              onViewChange={handleViewChange}
              selectedView={preferences.selectedView}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="!rounded-full"
                variant="secondary"
                onClick={resetPreferences}
              >
                <ArrowCounterClockwise
                  className="h-4 w-4"
                  weight={phosphorIconWeight}
                />
                重置
              </Button>
              {preferences.selectedView === "board" ? (
                <Button
                  type="button"
                  className="!rounded-full"
                  variant={editing ? "primary" : "secondary"}
                  onClick={() => setEditing((value) => !value)}
                >
                  {editing ? (
                    <FloppyDisk
                      className="h-4 w-4"
                      weight={phosphorIconWeight}
                    />
                  ) : (
                    <PencilSimpleLine
                      className="h-4 w-4"
                      weight={phosphorIconWeight}
                    />
                  )}
                  {editing ? "完成" : "编辑"}
                </Button>
              ) : null}
            </div>
          </div>

          {preferences.selectedView === "visual" ? (
            <VisualDashboardView
              actions={actions}
              cards={cards}
              diagnosis={diagnosis}
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
      </AuroraBackground>
    </section>
  );
});

const DashboardViewSwitcher = ({
  onViewChange,
  selectedView,
}: {
  onViewChange: (view: DashboardView) => void;
  selectedView: DashboardView;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<DashboardView, HTMLButtonElement | null>>({
    board: null,
    table: null,
    visual: null,
  });
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: "translate3d(0px, 0px, 0px)",
    width: 0,
  });

  const measureIndicator = useCallback(() => {
    const selectedButton = buttonRefs.current[selectedView];

    if (!selectedButton) {
      return;
    }

    setIndicatorStyle({
      transform: `translate3d(${selectedButton.offsetLeft}px, 0px, 0px)`,
      width: selectedButton.offsetWidth,
    });
  }, [selectedView]);

  useLayoutEffect(() => {
    measureIndicator();

    const observedElements = [
      rootRef.current,
      ...viewOptions.map(({ value }) => buttonRefs.current[value]),
    ].filter(
      (element): element is HTMLDivElement | HTMLButtonElement =>
        Boolean(element),
    );

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureIndicator);

      return () => {
        window.removeEventListener("resize", measureIndicator);
      };
    }

    const resizeObserver = new ResizeObserver(measureIndicator);
    observedElements.forEach((element) => resizeObserver.observe(element));

    return () => {
      resizeObserver.disconnect();
    };
  }, [measureIndicator]);

  return (
    <div
      ref={rootRef}
      className="relative isolate inline-flex rounded-full bg-white/90 p-1 shadow-[0_1px_1px_rgba(24,24,27,0.025),0_6px_18px_rgba(24,24,27,0.04)] backdrop-blur"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-0 z-0 rounded-full bg-zinc-950 will-change-[transform,width]",
          viewIndicatorTransition,
        )}
        data-testid="dashboard-view-indicator"
        style={indicatorStyle}
      />
      {viewOptions.map(({ icon: Icon, label, value }) => {
        const selected = selectedView === value;

        return (
          <button
            key={value}
            ref={(node) => {
              buttonRefs.current[value] = node;
            }}
            type="button"
            aria-pressed={selected}
            className="relative z-10 inline-flex h-9 items-center rounded-full px-3 text-sm font-medium outline-none transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            onClick={() => onViewChange(value)}
          >
            <span
              className={cn(
                "inline-flex items-center gap-2 text-white mix-blend-difference",
                selected ? "opacity-100" : "opacity-70",
              )}
            >
              <Icon className="h-4 w-4" weight={phosphorIconWeight} />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
