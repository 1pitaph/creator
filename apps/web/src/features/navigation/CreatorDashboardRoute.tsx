import { Navigate, useOutletContext } from "react-router";

import { DashboardPage } from "../dashboard/DashboardPage";
import type { CreatorOutletContext } from "./CreatorLayout";
import {
  getCreatorRoutePath,
  getDashboardPanelForRoute,
} from "./creatorRoutes";

export const CreatorDashboardRoute = () => {
  const {
    activeRouteId,
    creatorId,
    diagnosis,
    moduleLoadMode,
    onAskAgent,
    onModuleLoadModeChange,
    viewModel,
  } = useOutletContext<CreatorOutletContext>();
  const panel = getDashboardPanelForRoute(activeRouteId);

  if (!panel) {
    return <Navigate replace to={getCreatorRoutePath(creatorId)} />;
  }

  return (
    <DashboardPage
      creatorId={creatorId}
      diagnosis={diagnosis}
      moduleLoadMode={moduleLoadMode}
      onModuleLoadModeChange={onModuleLoadModeChange}
      panel={panel}
      onAskAgent={onAskAgent}
      viewModel={viewModel}
    />
  );
};
