import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildMultiMetricTrendSpec } from "./spec";

const MultiMetricTrendChart = memo(function MultiMetricTrendChart({
  intent,
  metrics,
  className,
  height = 260,
  ariaLabel
}: ChartStyleProps) {
  const spec = useMemo(() => buildMultiMetricTrendSpec(intent, metrics), [intent, metrics]);

  return <VChartCanvas className={className} height={height} spec={spec} ariaLabel={ariaLabel} />;
});

export default MultiMetricTrendChart;
