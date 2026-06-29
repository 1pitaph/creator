import { useOutletContext } from "react-router";

import { AuroraBackground } from "../../components/effects/AuroraBackground";
import type { CreatorOutletContext } from "./CreatorLayout";
import { getCreatorRouteLabel } from "./creatorRoutes";

export const CreatorComingSoonRoute = () => {
  const { activeRouteId } = useOutletContext<CreatorOutletContext>();
  const label = getCreatorRouteLabel(activeRouteId);

  return (
    <section className="min-w-0 flex-1">
      <AuroraBackground>
        <div className="px-5 py-5 xl:px-7">
          <div className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[18px] border border-dashed border-zinc-200 bg-white/65 px-6 text-center shadow-[0_1px_1px_rgba(24,24,27,0.025),0_8px_28px_rgba(24,24,27,0.04)]">
            <div>
              <p className="type-caption-xs text-zinc-500">建设中</p>
              <h1 className="type-section-title mt-2 text-zinc-950">{label}</h1>
            </div>
          </div>
        </div>
      </AuroraBackground>
    </section>
  );
};
