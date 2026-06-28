import type { DashboardPreferencesResponse, DashboardPreferencesV1 } from "@creator/data-contracts";

export const fetchDashboardPreferences = async (creatorId: string, signal?: AbortSignal) => {
  const response = await fetch(`/api/creator/${creatorId}/dashboard-preferences`, { signal });

  if (!response.ok) {
    throw new Error("Dashboard preferences request failed");
  }

  return (await response.json()) as DashboardPreferencesResponse;
};

export const saveDashboardPreferences = async (creatorId: string, preferences: DashboardPreferencesV1) => {
  const response = await fetch(`/api/creator/${creatorId}/dashboard-preferences`, {
    method: "PUT",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    throw new Error("Dashboard preferences save failed");
  }

  return (await response.json()) as DashboardPreferencesResponse;
};
