import { useCallback, useMemo, useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
  useParams,
} from "react-router";

import type { DiagnosisResponse, ModuleLoadMode } from "@creator/data-contracts";

import { AgentDrawerContainer } from "../agent/AgentDrawerContainer";
import { creatorOptions, defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { useCreatorDiagnosis } from "../creator-diagnosis/useCreatorDiagnosis";
import { buildDashboardViewModel } from "../dashboard/model";
import { InitialLoadingOverlay } from "../loading/InitialLoadingOverlay";
import { useInitialLoaderState } from "../loading/useInitialLoaderState";
import { CreatorSidebar } from "../sidebar/CreatorSidebar";
import type { AgentCommand, AskTarget, DashboardViewModel } from "../../types";
import {
  getCreatorRoutePath,
  type CreatorRouteId,
} from "./creatorRoutes";
import { getCreatorRouteIdFromMatches } from "./routeHandles";

const createAgentCommandId = () => crypto.randomUUID();

const creatorIds = new Set(creatorOptions.map((creator) => creator.id));

const isKnownCreatorId = (creatorId: string | undefined): creatorId is string =>
  typeof creatorId === "string" && creatorIds.has(creatorId);

export type CreatorOutletContext = {
  activeRouteId: CreatorRouteId;
  creatorId: string;
  diagnosis: DiagnosisResponse;
  moduleLoadMode: ModuleLoadMode;
  onAskAgent: (target: AskTarget) => void;
  onModuleLoadModeChange: (mode: ModuleLoadMode) => void;
  viewModel: DashboardViewModel;
};

export const CreatorLayout = () => {
  const { creatorId: routeCreatorId } = useParams();
  const matches = useMatches();
  const activeRouteId = getCreatorRouteIdFromMatches(matches);
  const navigate = useNavigate();
  const location = useLocation();
  const creatorId = isKnownCreatorId(routeCreatorId)
    ? routeCreatorId
    : defaultCreatorId;
  const [moduleLoadMode, setModuleLoadMode] =
    useState<ModuleLoadMode>("focused");
  const [agentCommand, setAgentCommand] = useState<AgentCommand | null>(null);

  const handleSelectCreator = useCallback(
    (nextCreatorId: string) => {
      navigate(`${getCreatorRoutePath(nextCreatorId, activeRouteId)}${location.search}`);
    },
    [activeRouteId, location.search, navigate],
  );
  const {
    diagnosis,
    isLoadingDiagnosis,
  } = useCreatorDiagnosis({
    creatorId,
    moduleLoadMode,
  });
  const viewModel = useMemo(
    () => buildDashboardViewModel(diagnosis),
    [diagnosis],
  );
  const { completeInitialLoader, initialLoaderActive, showInitialLoader } =
    useInitialLoaderState(isLoadingDiagnosis);
  const askAgent = useCallback((target: AskTarget) => {
    setAgentCommand({
      id: createAgentCommandId(),
      type: "ask",
      target,
    });
  }, []);
  const outletContext = useMemo(
    (): CreatorOutletContext => ({
      activeRouteId,
      creatorId,
      diagnosis,
      moduleLoadMode,
      onAskAgent: askAgent,
      onModuleLoadModeChange: setModuleLoadMode,
      viewModel,
    }),
    [activeRouteId, askAgent, creatorId, diagnosis, moduleLoadMode, viewModel],
  );

  if (!isKnownCreatorId(routeCreatorId)) {
    return (
      <Navigate
        replace
        to={getCreatorRoutePath(defaultCreatorId, activeRouteId)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <CreatorSidebar
          activeRouteId={activeRouteId}
          selectedCreatorId={creatorId}
          onSelectCreator={handleSelectCreator}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />

        <Outlet context={outletContext} />
      </div>

      <AgentDrawerContainer
        activeModuleIds={viewModel.activeModuleIds}
        command={agentCommand}
        creatorId={creatorId}
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
