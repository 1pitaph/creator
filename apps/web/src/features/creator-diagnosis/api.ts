import { createDiagnosis } from "@creator/ai-modules";
import type { DiagnosisResponse } from "@creator/data-contracts";
import { getMockCreator } from "@creator/mock-data";

export type DiagnosisFetcher = (creatorId: string, signal?: AbortSignal) => Promise<DiagnosisResponse>;

export const localDiagnosis = (creatorId: string) => {
  const creator = getMockCreator(creatorId);
  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics
  });
};

export const fetchDiagnosis: DiagnosisFetcher = async (creatorId, signal) => {
  const response = await fetch(`/api/creator/${creatorId}/diagnosis`, { signal });

  if (!response.ok) {
    throw new Error("Diagnosis request failed");
  }

  return (await response.json()) as DiagnosisResponse;
};
