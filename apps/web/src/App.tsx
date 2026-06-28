import { useCallback, useMemo, useState } from "react";

import { AgentDrawerContainer } from "./features/agent/AgentDrawerContainer";
import { defaultCreatorId } from "./features/creator-diagnosis/creatorOptions";
import { useCreatorDiagnosis } from "./features/creator-diagnosis/useCreatorDiagnosis";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { buildDashboardViewModel } from "./features/dashboard/model";
import { CreatorSidebar } from "./features/sidebar/CreatorSidebar";
import type { AgentCommand, AskTarget } from "./types";

const createAgentCommandId = () => crypto.randomUUID();

export const App = () => {
  const {
    selectedCreatorId,
    setSelectedCreatorId,
    diagnosis,
    isLoadingDiagnosis,
  } = useCreatorDiagnosis({
    initialCreatorId: defaultCreatorId,
  });
  const viewModel = useMemo(
    () => buildDashboardViewModel(diagnosis),
    [diagnosis],
  );
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
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />

        <DashboardPage
          creatorId={selectedCreatorId}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
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
    </main>
  );
};
