import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildMultiMetricTrendSpec } from "./spec";

const MultiMetricTrendChart = memo(function MultiMetricTrendChart({
  intent,
  metrics,
  className,
  height = 260,
  ariaLabel,
  compact = false,
}: ChartStyleProps) {
  const spec = useMemo(
    () => buildMultiMetricTrendSpec(intent, metrics, compact),
    [intent, metrics, compact],
  );

  return (
    <VChartCanvas
      className={className}
      height={height}
      spec={spec}
      ariaLabel={ariaLabel}
    />
  );
});

export default MultiMetricTrendChart;
