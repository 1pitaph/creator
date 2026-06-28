import { useCallback, useEffect, useMemo, useState } from "react";

import type { DashboardPreferencesV1 } from "@creator/data-contracts";

import {
  buildDefaultDashboardPreferences,
  parseDashboardPreferences,
  pickNewestDashboardPreferences,
  reconcileDashboardPreferences,
  updateDashboardPreferencesTimestamp,
  type DashboardActionCard,
  type DashboardCardDefinition
} from "./customization";
import { fetchDashboardPreferences, saveDashboardPreferences } from "./preferencesApi";

const storageKeyForCreator = (creatorId: string) => `creator-dashboard-preferences:${creatorId}:v1`;

const readLocalPreferences = (creatorId: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKeyForCreator(creatorId));

  if (!raw) {
    return null;
  }

  try {
    return parseDashboardPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeLocalPreferences = (creatorId: string, preferences: DashboardPreferencesV1) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeyForCreator(creatorId), JSON.stringify(preferences));
};

export const useDashboardPreferences = ({
  actions,
  cards,
  creatorId
}: {
  actions: DashboardActionCard[];
  cards: DashboardCardDefinition[];
  creatorId: string;
}) => {
  const defaults = useMemo(() => buildDefaultDashboardPreferences(creatorId, cards, actions), [actions, cards, creatorId]);
  const [remoteChecked, setRemoteChecked] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferencesV1>(() => {
    const local = readLocalPreferences(creatorId);
    const initial = pickNewestDashboardPreferences(defaults, local);
    return reconcileDashboardPreferences(initial, creatorId, cards, actions);
  });

  useEffect(() => {
    setRemoteChecked(false);
    setPreferences(() => {
      const local = readLocalPreferences(creatorId);
      const initial = pickNewestDashboardPreferences(defaults, local);
      return reconcileDashboardPreferences(initial, creatorId, cards, actions);
    });
  }, [actions, cards, creatorId, defaults]);

  useEffect(() => {
    const abortController = new AbortController();

    fetchDashboardPreferences(creatorId, abortController.signal)
      .then(({ preferences: serverPreferences }) => {
        const parsed = parseDashboardPreferences(serverPreferences);
        setPreferences((current) => {
          const reconciledCurrent = reconcileDashboardPreferences(current, creatorId, cards, actions);
          const reconciledServer = parsed ? reconcileDashboardPreferences(parsed, creatorId, cards, actions) : null;
          return pickNewestDashboardPreferences(reconciledCurrent, reconciledServer);
        });
      })
      .catch(() => {
        // Local preferences remain authoritative when the demo API is unavailable.
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setRemoteChecked(true);
        }
      });

    return () => abortController.abort();
  }, [actions, cards, creatorId]);

  useEffect(() => {
    writeLocalPreferences(creatorId, preferences);
  }, [creatorId, preferences]);

  useEffect(() => {
    if (!remoteChecked) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDashboardPreferences(creatorId, preferences).catch(() => {
        // The local copy is already saved; the next edit will retry the API.
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [creatorId, preferences, remoteChecked]);

  const updatePreferences = useCallback(
    (updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => {
      setPreferences((current) => {
        const nextPreferences = updater(current);

        return nextPreferences === current ? current : updateDashboardPreferencesTimestamp(nextPreferences);
      });
    },
    []
  );

  const resetPreferences = useCallback(() => {
    setPreferences(buildDefaultDashboardPreferences(creatorId, cards, actions));
  }, [actions, cards, creatorId]);

  return {
    preferences,
    resetPreferences,
    updatePreferences
  };
};
