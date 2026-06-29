import { memo, useLayoutEffect } from "react";

import { PixelLogoLoader } from "./PixelLogoLoader";

type InitialLoadingOverlayProps = {
  active: boolean;
  onExitComplete?: () => void;
};

export const InitialLoadingOverlay = memo(function InitialLoadingOverlay({ active, onExitComplete }: InitialLoadingOverlayProps) {
  useLayoutEffect(() => {
    document.getElementById("instant-splash")?.remove();
  }, []);

  return (
    <div
      aria-label="正在加载创作者画像"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#f5f6f8] px-6"
      data-active={active ? "true" : "false"}
      data-testid="initial-loading-overlay"
      role="status"
    >
      <PixelLogoLoader active={active} onExitComplete={onExitComplete} />
    </div>
  );
});
