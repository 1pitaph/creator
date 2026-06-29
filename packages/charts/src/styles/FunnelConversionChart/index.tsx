import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildFunnelConversionSpec } from "./spec";

const FunnelConversionChart = memo(function FunnelConversionChart({
  metrics,
  className,
  height = 260,
  ariaLabel,
  compact = false,
}: ChartStyleProps) {
  const spec = useMemo(
    () => buildFunnelConversionSpec(metrics, compact),
    [metrics, compact],
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

export default FunnelConversionChart;
