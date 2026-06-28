import { memo } from "react";
import { VChart, type ISpec } from "@visactor/react-vchart";

type VChartCanvasProps = {
  spec: ISpec;
  className?: string;
  height?: number | string;
  ariaLabel: string;
};

export const VChartCanvas = memo(function VChartCanvas({ spec, className, height = 180, ariaLabel }: VChartCanvasProps) {
  return (
    <div className={className} role="img" aria-label={ariaLabel} style={{ height }}>
      <VChart className="h-full w-full" spec={spec} options={{ mode: "desktop-browser" }} />
    </div>
  );
});
