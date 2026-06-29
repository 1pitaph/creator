import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildDualAxisTrendSpec } from "./spec";

const DualAxisTrendChart = memo(function DualAxisTrendChart({
  intent,
  metrics,
  className,
  height = 260,
  ariaLabel,
  compact = false,
}: ChartStyleProps) {
  const spec = useMemo(
    () => buildDualAxisTrendSpec(intent, metrics, compact),
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

export default DualAxisTrendChart;
