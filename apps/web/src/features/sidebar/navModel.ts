import type { CreatorRouteId } from "../navigation/creatorRoutes";
import { sidebarNavItems } from "./navItems";

export const getDefaultSidebarOpenGroups = (): Record<string, boolean> => ({});

export const getSidebarGroupIdForRoute = (routeId: CreatorRouteId) => {
  for (const item of sidebarNavItems) {
    if (item.kind === "group") {
      const routeIsInGroup = item.children.some(
        (child) => child.routeId === routeId,
      );

      if (routeIsInGroup) {
        return item.id;
      }
    }
  }

  return null;
};
