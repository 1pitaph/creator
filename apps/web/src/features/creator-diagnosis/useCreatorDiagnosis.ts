import type { DiagnosisResponse, ModuleLoadMode } from "@creator/data-contracts";
import { useEffect, useRef, useState } from "react";

import { defaultCreatorId } from "./creatorOptions";
import { fetchDiagnosis, localDiagnosis, type DiagnosisFetcher } from "./api";

type UseCreatorDiagnosisOptions = {
  fetcher?: DiagnosisFetcher;
  fallback?: (creatorId: string, moduleLoadMode?: ModuleLoadMode) => DiagnosisResponse;
  initialCreatorId?: string;
  moduleLoadMode?: ModuleLoadMode;
};

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export const useCreatorDiagnosis = ({
  fetcher = fetchDiagnosis,
  fallback = localDiagnosis,
  initialCreatorId = defaultCreatorId,
  moduleLoadMode = "focused"
}: UseCreatorDiagnosisOptions = {}) => {
  const [selectedCreatorId, setSelectedCreatorId] = useState(initialCreatorId);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse>(() => fallback(initialCreatorId, moduleLoadMode));
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoadingDiagnosis(true);

    fetcher(selectedCreatorId, moduleLoadMode, controller.signal)
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return null;
        }

        return fallback(selectedCreatorId, moduleLoadMode);
      })
      .then((nextDiagnosis) => {
        if (nextDiagnosis && requestIdRef.current === requestId) {
          setDiagnosis(nextDiagnosis);
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoadingDiagnosis(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [fallback, fetcher, moduleLoadMode, selectedCreatorId]);

  return {
    diagnosis,
    isLoadingDiagnosis,
    selectedCreatorId,
    setSelectedCreatorId
  };
};
