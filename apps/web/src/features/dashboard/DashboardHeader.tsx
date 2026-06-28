import { SquaresFour } from "@phosphor-icons/react/SquaresFour";

import type { DiagnosisResponse } from "@creator/data-contracts";
import { Badge } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";

export const DashboardHeader = ({
  diagnosis,
  isLoadingDiagnosis,
}: {
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
}) => (
  <header className="sticky top-16 z-30 border-b border-zinc-200/80 bg-[#f5f6f8]/90 px-5 py-4 backdrop-blur md:top-0 xl:px-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <SquaresFour className="h-3.5 w-3.5" weight={phosphorIconWeight} />
          <span>创作者 AI 数据面板</span>
          <span>·</span>
          <span>2026-06-28</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
          {diagnosis.creator.displayName} 的增长诊断台
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={isLoadingDiagnosis ? "amber" : "green"}>
          {isLoadingDiagnosis ? "正在加载画像" : "Demo 数据已就绪"}
        </Badge>
      </div>
    </div>
  </header>
);
