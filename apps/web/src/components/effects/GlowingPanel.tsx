import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { cn } from "@creator/ui";

const glowBaseStyle = {
  "--glow-x": "50%",
  "--glow-y": "0%"
} as CSSProperties;

const glowBorderStyle = {
  background:
    "radial-gradient(220px circle at var(--glow-x) var(--glow-y), rgba(24,24,27,0.26), rgba(113,113,122,0.12) 38%, transparent 70%)",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude"
} as CSSProperties;

const glowHaloStyle = {
  background:
    "radial-gradient(280px circle at var(--glow-x) var(--glow-y), rgba(24,24,27,0.08), rgba(113,113,122,0.04) 34%, transparent 68%)"
} as CSSProperties;

export const GlowingPanel = ({ className, children }: { className?: string; children: ReactNode }) => {
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);

  const flushGlowPosition = useCallback((element: HTMLDivElement) => {
    frameRef.current = null;

    const point = pointRef.current;

    if (!point) {
      return;
    }

    element.style.setProperty("--glow-x", `${point.x}px`);
    element.style.setProperty("--glow-y", `${point.y}px`);
  }, []);

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    rectRef.current = event.currentTarget.getBoundingClientRect();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = rectRef.current;

    if (!rect) {
      return;
    }

    pointRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (frameRef.current === null) {
      const element = event.currentTarget;
      frameRef.current = window.requestAnimationFrame(() => flushGlowPosition(element));
    }
  };

  const handlePointerLeave = () => {
    rectRef.current = null;
    pointRef.current = null;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  return (
    <div
      className={cn(
        "group relative isolate rounded-[20px] bg-transparent shadow-[0_1px_1px_rgba(24,24,27,0.025),0_4px_14px_rgba(24,24,27,0.032)] transition duration-300 hover:shadow-[0_1px_2px_rgba(24,24,27,0.05),0_16px_42px_rgba(24,24,27,0.075)]",
        className
      )}
      data-testid="dashboard-module-card"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={glowBaseStyle}
    >
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[24px] opacity-0 blur-xl transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={glowHaloStyle}
      />
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] p-px opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={glowBorderStyle}
      />
      {children}
    </div>
  );
};
