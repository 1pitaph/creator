import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { memo, useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const VIEWBOX_SIZE = 24;
const GRID_SIZE = 12;
const PIXEL_SIZE = VIEWBOX_SIZE / GRID_SIZE;
const TIKTOK_PATH =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

type PixelLogoLoaderProps = {
  active: boolean;
  onExitComplete?: () => void;
  size?: number;
};

type Pixel = {
  color: string;
  driftX: number;
  driftY: number;
  id: string;
  opacity: number;
  rotation: number;
  scale: number;
  x: number;
  y: number;
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

const pixels: Pixel[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
  const row = Math.floor(index / GRID_SIZE);
  const column = index % GRID_SIZE;
  const distanceFromCenter = Math.hypot(column - (GRID_SIZE - 1) / 2, row - (GRID_SIZE - 1) / 2);
  const color = index % 7 === 0 ? "#25f4ee" : index % 5 === 0 ? "#fe2c55" : index % 3 === 0 ? "#18181b" : "#71717a";

  return {
    color,
    driftX: (column - (GRID_SIZE - 1) / 2) * 0.22,
    driftY: (row - (GRID_SIZE - 1) / 2) * 0.22,
    id: `${row}-${column}`,
    opacity: Math.max(0.28, 0.96 - distanceFromCenter * 0.09),
    rotation: ((index % 9) - 4) * 5,
    scale: 0.62 + ((index % 4) * 0.1),
    x: column * PIXEL_SIZE,
    y: row * PIXEL_SIZE
  };
});

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
