import { memo, useMemo } from "react";

import type { ChartStyleProps } from "../../types";
import { VChartCanvas } from "../shared/VChartCanvas";
import { buildFunnelConversionSpec } from "./spec";

const FunnelConversionChart = memo(function FunnelConversionChart({ metrics, className, height = 260, ariaLabel }: ChartStyleProps) {
  const spec = useMemo(() => buildFunnelConversionSpec(metrics), [metrics]);

  return <VChartCanvas className={className} height={height} spec={spec} ariaLabel={ariaLabel} />;
});

export default FunnelConversionChart;
