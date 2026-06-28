import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildRadarScoreSpec } from "./spec";

const RadarScoreChart = memo(function RadarScoreChart({ metrics, className, height = 260, ariaLabel }: ChartStyleProps) {
  const spec = useMemo(() => buildRadarScoreSpec(metrics), [metrics]);

  return <VChartCanvas className={className} height={height} spec={spec} ariaLabel={ariaLabel} />;
});

export default RadarScoreChart;
