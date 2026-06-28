import { createDiagnosis } from "@creator/ai-modules";
import type { DiagnosisResponse, ModuleLoadMode } from "@creator/data-contracts";
import { getMockCreator } from "@creator/mock-data";

export type DiagnosisFetcher = (creatorId: string, moduleLoadMode?: ModuleLoadMode, signal?: AbortSignal) => Promise<DiagnosisResponse>;

export const localDiagnosis = (creatorId: string, moduleLoadMode: ModuleLoadMode = "focused") => {
  const creator = getMockCreator(creatorId);
  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics,
    moduleLoadMode
  });
};

export const fetchDiagnosis: DiagnosisFetcher = async (creatorId, moduleLoadMode = "focused", signal) => {
  const searchParams = new URLSearchParams({ moduleLoadMode });
  const response = await fetch(`/api/creator/${creatorId}/diagnosis?${searchParams.toString()}`, { signal });

  if (!response.ok) {
    throw new Error("Diagnosis request failed");
  }

  return (await response.json()) as DiagnosisResponse;
};
