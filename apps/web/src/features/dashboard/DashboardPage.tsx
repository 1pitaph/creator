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

import type { DiagnosisResponse, ModuleLoadMode } from "@creator/data-contracts";
import { Button, cn } from "@creator/ui";

import { AuroraBackground } from "../../components/effects/AuroraBackground";
import { moduleLoadModeDescriptions, moduleLoadModeLabels, phosphorIconWeight } from "../../constants";
import type { AskTarget, DashboardPanel, DashboardViewModel } from "../../types";
import {
  buildDashboardActionCards,
  buildDashboardCards,
} from "./customization";
import { useDashboardPreferences } from "./useDashboardPreferences";
import { BoardDashboardView } from "./views/BoardDashboardView";
import { TableDashboardView } from "./views/TableDashboardView";
import { VisualDashboardView } from "./views/VisualDashboardView";

const moduleLoadModeOptions: Array<{
  icon: typeof SquaresFour;
  value: ModuleLoadMode;
}> = [
  { icon: SquaresFour, value: "focused" },
  { icon: Kanban, value: "complete" },
  { icon: Table, value: "adaptive" },
];

const modeIndicatorTransition =
  "transition-[transform,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none";

export const DashboardPage = memo(function DashboardPage({
  creatorId,
  diagnosis,
  moduleLoadMode,
  onAskAgent,
  onModuleLoadModeChange,
  panel,
  viewModel,
}: {
  creatorId: string;
  diagnosis: DiagnosisResponse;
  moduleLoadMode: ModuleLoadMode;
  onAskAgent: (target: AskTarget) => void;
  onModuleLoadModeChange: (mode: ModuleLoadMode) => void;
  panel: DashboardPanel;
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

  const handleModuleLoadModeChange = useCallback(
    (mode: ModuleLoadMode) => {
      setEditing(false);
      onModuleLoadModeChange(mode);
    },
    [onModuleLoadModeChange],
  );

  return (
    <section className="min-w-0 flex-1">
      <AuroraBackground>
        <div className="space-y-5 px-5 py-5 xl:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <ModuleLoadModeSwitcher
                onModeChange={handleModuleLoadModeChange}
                selectedMode={moduleLoadMode}
              />
            </div>

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
              {panel === "board" ? (
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

          {panel === "overview" ? (
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

          {panel === "board" ? (
            <BoardDashboardView
              actions={actions}
              editing={editing}
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          ) : null}

          {panel === "table" ? (
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

const ModuleLoadModeSwitcher = ({
  onModeChange,
  selectedMode,
}: {
  onModeChange: (mode: ModuleLoadMode) => void;
  selectedMode: ModuleLoadMode;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<ModuleLoadMode, HTMLButtonElement | null>>({
    adaptive: null,
    complete: null,
    focused: null,
  });
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: "translate3d(0px, 0px, 0px)",
    width: 0,
  });

  const measureIndicator = useCallback(() => {
    const selectedButton = buttonRefs.current[selectedMode];

    if (!selectedButton) {
      return;
    }

    setIndicatorStyle({
      transform: `translate3d(${selectedButton.offsetLeft}px, 0px, 0px)`,
      width: selectedButton.offsetWidth,
    });
  }, [selectedMode]);

  useLayoutEffect(() => {
    measureIndicator();

    const observedElements = [
      rootRef.current,
      ...moduleLoadModeOptions.map(({ value }) => buttonRefs.current[value]),
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
      className="relative inline-flex rounded-full bg-white/90 p-1 shadow-[0_1px_1px_rgba(24,24,27,0.025),0_6px_18px_rgba(24,24,27,0.04)] backdrop-blur"
      aria-label="模块加载模式"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-0 z-0 rounded-full bg-zinc-950 will-change-[transform,width]",
          modeIndicatorTransition,
        )}
        data-testid="dashboard-mode-indicator"
        style={indicatorStyle}
      />
      {moduleLoadModeOptions.map(({ icon: Icon, value }) => {
        const selected = selectedMode === value;

        return (
          <button
            key={value}
            ref={(node) => {
              buttonRefs.current[value] = node;
            }}
            type="button"
            aria-pressed={selected}
            title={moduleLoadModeDescriptions[value]}
            className="group/view relative z-10 inline-flex h-9 items-center rounded-full px-3 text-sm font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            onClick={() => onModeChange(value)}
          >
            <span
              className={cn(
                "inline-flex items-center gap-2 transition-colors",
                selected
                  ? "text-white"
                  : "text-zinc-600 group-hover/view:text-zinc-950",
              )}
            >
              <Icon className="h-4 w-4" weight={phosphorIconWeight} />
              {moduleLoadModeLabels[value]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
