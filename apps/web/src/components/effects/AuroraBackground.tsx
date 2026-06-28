import type { ReactNode } from "react";

import { cn } from "@creator/ui";

export const AuroraBackground = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "relative isolate min-h-screen overflow-hidden bg-[#f5f6f8]",
      className,
    )}
    data-testid="aurora-background"
  >
    <div
      aria-hidden="true"
      className="aurora-background__shader pointer-events-none absolute inset-0 z-0"
    >
      <div className="aurora-background__mesh absolute inset-x-[-18%] top-[-22%] h-[68vh] min-h-[520px]" />
      <div className="aurora-background__bloom absolute inset-x-[-10%] top-[18%] h-[46vh]" />
      <div className="aurora-background__veil absolute inset-0" />
    </div>

    <div className="relative z-10 min-h-screen">{children}</div>
  </div>
);
