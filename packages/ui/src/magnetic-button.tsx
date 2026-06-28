import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "./utils/cn";

const IDLE_TRANSFORM = "translate3d(0px, 0px, 0px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const readPrefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    readPrefersReducedMotion,
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
};

export const MagneticButton = ({
  children,
  className,
  disabled = false,
  resetDurationMs = 180,
  strength = 0.28,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  resetDurationMs?: number;
  strength?: number;
}) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const setTransform = useCallback(
    (x: number, y: number, transitionDurationMs: number) => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      root.style.transition = `transform ${transitionDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      root.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px)`;
    },
    [],
  );

  const resetTransform = useCallback(() => {
    setTransform(0, 0, resetDurationMs);
  }, [resetDurationMs, setTransform]);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (disabled || prefersReducedMotion) {
        resetTransform();
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;

      setTransform(offsetX * strength, offsetY * strength, 80);
    },
    [disabled, prefersReducedMotion, resetTransform, setTransform, strength],
  );

  useEffect(() => {
    if (disabled || prefersReducedMotion) {
      resetTransform();
    }
  }, [disabled, prefersReducedMotion, resetTransform]);

  return (
    <span
      ref={rootRef}
      className={cn("inline-block will-change-transform", className)}
      onBlur={resetTransform}
      onPointerLeave={resetTransform}
      onPointerMove={handlePointerMove}
      style={{ transform: IDLE_TRANSFORM }}
    >
      {children}
    </span>
  );
};
