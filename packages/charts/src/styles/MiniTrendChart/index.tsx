import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildMiniTrendSpec } from "./spec";

const MiniTrendChart = memo(function MiniTrendChart({ intent, metrics, className, height = 72, tone, ariaLabel }: ChartStyleProps) {
  const spec = useMemo(() => buildMiniTrendSpec(intent, metrics, tone), [intent, metrics, tone]);

  return <VChartCanvas className={className} height={height} spec={spec} ariaLabel={ariaLabel} />;
});

export default MiniTrendChart;
