import { Navigate, type RouteObject } from "react-router";

import { CreatorComingSoonRoute } from "./features/navigation/CreatorComingSoonRoute";
import { CreatorDashboardRoute } from "./features/navigation/CreatorDashboardRoute";
import { CreatorLayout } from "./features/navigation/CreatorLayout";
import {
  creatorRouteDefinitions,
  creatorRouteIds,
  getCreatorRoutePath,
  getDashboardPanelForRoute,
  type CreatorRouteId,
} from "./features/navigation/creatorRoutes";
import type { CreatorRouteHandle } from "./features/navigation/routeHandles";
import { defaultCreatorId } from "./features/creator-diagnosis/creatorOptions";

const createRouteHandle = (routeId: CreatorRouteId): CreatorRouteHandle => ({
  routeId,
});

const creatorChildRoutes: RouteObject[] = creatorRouteIds.map((routeId) => {
  const route = creatorRouteDefinitions[routeId];
  const panel = getDashboardPanelForRoute(routeId);

  return {
    path: route.path,
    element: panel ? <CreatorDashboardRoute /> : <CreatorComingSoonRoute />,
    handle: createRouteHandle(routeId),
  };
});

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: (
      <Navigate replace to={getCreatorRoutePath(defaultCreatorId, "overview")} />
    ),
  },
  {
    path: "/creators",
    element: (
      <Navigate replace to={getCreatorRoutePath(defaultCreatorId, "overview")} />
    ),
  },
  {
    path: "/creators/:creatorId",
    element: <CreatorLayout />,
    children: [
      {
        index: true,
        element: <Navigate replace to="overview" />,
      },
      ...creatorChildRoutes,
      {
        path: "*",
        element: <Navigate replace to="overview" />,
      },
    ],
  },
  {
    path: "*",
    element: (
      <Navigate replace to={getCreatorRoutePath(defaultCreatorId, "overview")} />
    ),
  },
];
