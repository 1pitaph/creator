import { preloadDashboardPanel } from "../dashboard/DashboardPage";
import {
  getDashboardPanelForRoute,
  type CreatorRouteId,
} from "./creatorRoutes";

export const preloadCreatorRoute = (routeId: CreatorRouteId) => {
  const panel = getDashboardPanelForRoute(routeId);

  if (panel) {
    preloadDashboardPanel(panel);
  }
};
