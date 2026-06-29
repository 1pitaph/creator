import type { CreatorRouteId } from "../navigation/creatorRoutes";
import { sidebarNavItems } from "./navItems";

export const getDefaultSidebarOpenGroups = () =>
  sidebarNavItems.reduce<Record<string, boolean>>((groups, item) => {
    if (item.kind === "group" && item.defaultOpen) {
      groups[item.id] = true;
    }

    return groups;
  }, {});

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
