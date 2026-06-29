import type { UIMatch } from "react-router";

import {
  defaultCreatorRouteId,
  isCreatorRouteId,
  type CreatorRouteId,
} from "./creatorRoutes";

export type CreatorRouteHandle = {
  routeId: CreatorRouteId;
};

export const getCreatorRouteIdFromMatches = (
  matches: UIMatch[],
): CreatorRouteId => {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle;

    if (
      handle &&
      typeof handle === "object" &&
      "routeId" in handle &&
      typeof handle.routeId === "string" &&
      isCreatorRouteId(handle.routeId)
    ) {
      return handle.routeId;
    }
  }

  return defaultCreatorRouteId;
};
