import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildHeatmapCalendarSpec } from "./spec";

const HeatmapCalendarChart = memo(function HeatmapCalendarChart({ intent, metrics, className, height = 180, ariaLabel }: ChartStyleProps) {
  const spec = useMemo(() => buildHeatmapCalendarSpec(intent, metrics), [intent, metrics]);

  return <VChartCanvas className={className} height={height} spec={spec} ariaLabel={ariaLabel} />;
});

export default HeatmapCalendarChart;
