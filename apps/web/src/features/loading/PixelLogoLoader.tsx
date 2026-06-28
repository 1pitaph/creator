import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { memo, useEffect, useRef, useState } from "react";

import { GRID_SIZE, PIXEL_SIZE, TIKTOK_PATH, pixels } from "./pixelLogoGeometry";

gsap.registerPlugin(useGSAP);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type PixelLogoLoaderProps = {
  active: boolean;
  onExitComplete?: () => void;
  size?: number;
};

const readPrefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
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

export const PixelLogoLoader = memo(function PixelLogoLoader({ active, onExitComplete, size = 96 }: PixelLogoLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onExitCompleteRef = useRef(onExitComplete);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    onExitCompleteRef.current = onExitComplete;
  }, [onExitComplete]);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const pixelNodes = Array.from(root.querySelectorAll<SVGRectElement>(".pixel-logo-loader__pixel"));
      const logo = root.querySelector<SVGGElement>(".pixel-logo-loader__logo");

      if (!logo) {
        return;
      }

      gsap.killTweensOf([root, logo, ...pixelNodes]);

      if (prefersReducedMotion) {
        gsap.set(root, { opacity: active ? 1 : 0, scale: 1 });
        gsap.set(pixelNodes, { opacity: 0 });
        gsap.set(logo, { opacity: 1, scale: 1, transformOrigin: "50% 50%" });

        if (!active) {
          onExitCompleteRef.current?.();
        }

        return;
      }

      if (!active) {
        gsap.to(root, {
          duration: 0.22,
          ease: "power2.in",
          opacity: 0,
          scale: 0.98,
          onComplete: () => onExitCompleteRef.current?.()
        });
        return;
      }

      const timeline = gsap.timeline();

      timeline
        .set(root, { opacity: 1, scale: 1 })
        .set(logo, { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" })
        .set(pixelNodes, {
          opacity: 0,
          rotation: (_index, target: SVGRectElement) => Number(target.dataset.rotation),
          scale: 0.22,
          transformOrigin: "50% 50%",
          x: (_index, target: SVGRectElement) => Number(target.dataset.driftX),
          y: (_index, target: SVGRectElement) => Number(target.dataset.driftY)
        })
        .to(pixelNodes, {
          duration: 0.3,
          ease: "power2.out",
          opacity: (_index, target: SVGRectElement) => Number(target.dataset.opacity),
          scale: (_index, target: SVGRectElement) => Number(target.dataset.scale),
          stagger: { amount: 0.3, from: "center", grid: [GRID_SIZE, GRID_SIZE] }
        })
        .to(
          pixelNodes,
          {
            duration: 0.45,
            ease: "power2.inOut",
            opacity: 0.92,
            rotation: 0,
            scale: 0.82,
            stagger: { amount: 0.2, from: "edges", grid: [GRID_SIZE, GRID_SIZE] },
            x: 0,
            y: 0
          },
          "-=0.08"
        )
        .to(
          logo,
          {
            duration: 0.35,
            ease: "back.out(1.8)",
            opacity: 1,
            scale: 1
          },
          "-=0.2"
        )
        .to(
          pixelNodes,
          {
            duration: 0.3,
            ease: "power2.in",
            opacity: 0,
            scale: 0.35,
            stagger: { amount: 0.16, from: "center", grid: [GRID_SIZE, GRID_SIZE] }
          },
          "-=0.05"
        );
    },
    { dependencies: [active, prefersReducedMotion], scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="will-change-transform"
      data-active={active ? "true" : "false"}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      data-testid="pixel-logo-loader"
      style={{ height: size, width: size }}
    >
      <svg aria-hidden="true" className="block h-full w-full overflow-visible" focusable="false" role="img" viewBox="0 0 24 24">
        <g opacity="0.9">
          {pixels.map((pixel) => (
            <rect
              key={pixel.id}
              className="pixel-logo-loader__pixel"
              data-drift-x={pixel.driftX}
              data-drift-y={pixel.driftY}
              data-opacity={pixel.opacity}
              data-rotation={pixel.rotation}
              data-scale={pixel.scale}
              fill={pixel.color}
              height={PIXEL_SIZE * 0.72}
              opacity="0"
              rx="0.18"
              width={PIXEL_SIZE * 0.72}
              x={pixel.x + PIXEL_SIZE * 0.14}
              y={pixel.y + PIXEL_SIZE * 0.14}
            />
          ))}
        </g>

        <g className="pixel-logo-loader__logo" opacity="0">
          {/* Path sourced from simple-icons' TikTok SVG, CC0-1.0. TikTok/Douyin trademarks remain their owners' property. */}
          <path d={TIKTOK_PATH} fill="#25f4ee" transform="translate(-0.35 0.25)" />
          <path d={TIKTOK_PATH} fill="#fe2c55" transform="translate(0.35 -0.2)" />
          <path d={TIKTOK_PATH} fill="#050505" />
        </g>
      </svg>
    </div>
  );
});
