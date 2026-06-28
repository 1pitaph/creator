import { useCallback, useMemo, useState } from "react";

import type { ModuleLoadMode } from "@creator/data-contracts";

import { AgentDrawerContainer } from "./features/agent/AgentDrawerContainer";
import { defaultCreatorId } from "./features/creator-diagnosis/creatorOptions";
import { useCreatorDiagnosis } from "./features/creator-diagnosis/useCreatorDiagnosis";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { buildDashboardViewModel } from "./features/dashboard/model";
import { InitialLoadingOverlay } from "./features/loading/InitialLoadingOverlay";
import { useInitialLoaderState } from "./features/loading/useInitialLoaderState";
import { CreatorSidebar } from "./features/sidebar/CreatorSidebar";
import type { AgentCommand, AskTarget, DashboardPanel } from "./types";

const createAgentCommandId = () => crypto.randomUUID();

export const App = () => {
  const [moduleLoadMode, setModuleLoadMode] = useState<ModuleLoadMode>("focused");
  const [dashboardPanel, setDashboardPanel] = useState<DashboardPanel>("overview");
  const {
    selectedCreatorId,
    setSelectedCreatorId,
    diagnosis,
    isLoadingDiagnosis,
  } = useCreatorDiagnosis({
    initialCreatorId: defaultCreatorId,
    moduleLoadMode,
  });
  const viewModel = useMemo(
    () => buildDashboardViewModel(diagnosis),
    [diagnosis],
  );
  const { completeInitialLoader, initialLoaderActive, showInitialLoader } =
    useInitialLoaderState(isLoadingDiagnosis);
  const [agentCommand, setAgentCommand] = useState<AgentCommand | null>(null);

  const askAgent = useCallback((target: AskTarget) => {
    setAgentCommand({
      id: createAgentCommandId(),
      type: "ask",
      target,
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <CreatorSidebar
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={setSelectedCreatorId}
          selectedPanel={dashboardPanel}
          onSelectPanel={setDashboardPanel}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />

        <DashboardPage
          creatorId={selectedCreatorId}
          diagnosis={diagnosis}
          moduleLoadMode={moduleLoadMode}
          onModuleLoadModeChange={setModuleLoadMode}
          panel={dashboardPanel}
          onAskAgent={askAgent}
          viewModel={viewModel}
        />
      </div>

      <AgentDrawerContainer
        activeModuleIds={viewModel.activeModuleIds}
        command={agentCommand}
        creatorId={selectedCreatorId}
        diagnosis={diagnosis}
      />

      {showInitialLoader ? (
        <InitialLoadingOverlay
          active={initialLoaderActive}
          onExitComplete={completeInitialLoader}
        />
      ) : null}
    </main>
  );
};
