import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { Check } from "@phosphor-icons/react/Check";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
  useIsPresent,
} from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn, MagneticButton } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";
import { creatorOptions } from "../creator-diagnosis/creatorOptions";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PANEL_GAP = 8;
const PANEL_MARGIN = 12;
const COLLAPSED_PANEL_WIDTH = 248;
const ESTIMATED_PANEL_HEIGHT = 236;
const notchSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.85,
};

type Placement = "above" | "below";

type PanelPosition = {
  left: number;
  top: number;
  width: number;
  placement: Placement;
};

type CreatorAccountListboxProps = {
  activeIndex: number;
  activeOptionId: string;
  listboxId: string;
  onActiveIndexChange: (index: number) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onSelectIndex: (index: number) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  selectedCreatorId: string;
};

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

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "-");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const requestFrame = (callback: FrameRequestCallback) => {
  if (typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(() => callback(window.performance.now()), 0);
};

const getCreatorIndex = (creatorId: string) => {
  const index = creatorOptions.findIndex((creator) => creator.id === creatorId);

  return index >= 0 ? index : 0;
};

const getNextIndex = (index: number, delta: number) =>
  creatorOptions.length === 0
    ? 0
    : (index + delta + creatorOptions.length) % creatorOptions.length;

const CreatorAccountListbox = ({
  activeIndex,
  activeOptionId,
  listboxId,
  onActiveIndexChange,
  onKeyDown,
  onSelectIndex,
  panelRef,
  selectedCreatorId,
}: CreatorAccountListboxProps) => {
  const isPresent = useIsPresent();

  return (
    <div
      ref={panelRef}
      id={listboxId}
      role={isPresent ? "listbox" : undefined}
      tabIndex={-1}
      aria-activedescendant={isPresent ? activeOptionId : undefined}
      aria-hidden={isPresent ? undefined : "true"}
      aria-label={isPresent ? "选择创作者账号" : undefined}
      className="relative z-10 max-h-[min(280px,calc(100vh-2rem))] overflow-y-auto rounded-2xl bg-white p-1.5 outline-none"
      data-testid="creator-account-notch-listbox"
      onKeyDown={onKeyDown}
    >
      {creatorOptions.map((creator, index) => {
        const isSelected = creator.id === selectedCreatorId;
        const isActive = index === activeIndex;

        return (
          <button
            key={creator.id}
            id={`creator-account-option-${listboxId}-${index}`}
            type="button"
            role={isPresent ? "option" : undefined}
            aria-selected={isPresent ? isSelected : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition",
              isActive && "bg-neutral-100",
              isSelected && "font-semibold text-neutral-950",
              !isSelected && "text-neutral-700",
            )}
            onClick={() => onSelectIndex(index)}
            onMouseEnter={() => onActiveIndexChange(index)}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
                isSelected
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700",
              )}
              aria-hidden="true"
            >
              {creator.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{creator.name}</span>
              <span className="mt-0.5 block truncate text-xs font-normal text-neutral-500">
                {creator.handle} · {creator.domain}
              </span>
            </span>
            {isSelected ? (
              <Check
                className="h-4 w-4 shrink-0 text-neutral-950"
                weight={phosphorIconWeight}
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export const CreatorAccountNotchSelect = ({
  selectedCreatorId,
  onSelectCreator,
  collapsed = false,
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  collapsed?: boolean;
}) => {
  const reactId = sanitizeId(useId());
  const listboxId = `creator-account-listbox-${reactId}`;
  const selectedIndex = getCreatorIndex(selectedCreatorId);
  const selectedCreator = creatorOptions[selectedIndex] ??
    creatorOptions[0] ?? {
      id: selectedCreatorId,
      name: "创作者账号",
      handle: "@creator",
      domain: "Demo",
    };
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({
    left: 0,
    top: 0,
    width: collapsed ? COLLAPSED_PANEL_WIDTH : 220,
    placement: "above",
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const transition: Transition = prefersReducedMotion
    ? { duration: 0.08, ease: "easeOut" }
    : notchSpring;
  const layoutId = `creator-account-notch-bg-${reactId}`;
  const activeOptionId = `creator-account-option-${listboxId}-${activeIndex}`;

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger || typeof window === "undefined") {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const panelWidth = collapsed
      ? COLLAPSED_PANEL_WIDTH
      : Math.max(rect.width, 220);
    const measuredHeight =
      panelRef.current?.offsetHeight || ESTIMATED_PANEL_HEIGHT;
    const naturalLeft = collapsed
      ? rect.left + rect.width / 2 - panelWidth / 2
      : rect.left;
    const maxLeft = Math.max(PANEL_MARGIN, viewportWidth - panelWidth - PANEL_MARGIN);
    const left = clamp(naturalLeft, PANEL_MARGIN, maxLeft);
    const topAbove = rect.top - measuredHeight - PANEL_GAP;
    const hasRoomAbove = topAbove >= PANEL_MARGIN;
    const topBelow = rect.bottom + PANEL_GAP;
    const maxTop = Math.max(
      PANEL_MARGIN,
      viewportHeight - measuredHeight - PANEL_MARGIN,
    );

    setPanelPosition({
      left,
      top: hasRoomAbove ? topAbove : clamp(topBelow, PANEL_MARGIN, maxTop),
      width: panelWidth,
      placement: hasRoomAbove ? "above" : "below",
    });
  };

  const closePanel = ({ restoreFocus = false } = {}) => {
    setIsOpen(false);

    if (restoreFocus) {
      requestFrame(() => triggerRef.current?.focus());
    }
  };

  const openPanel = () => {
    setActiveIndex(selectedIndex);
    updatePanelPosition();
    setIsOpen(true);
  };

  const togglePanel = () => {
    if (isOpen) {
      closePanel({ restoreFocus: true });
      return;
    }

    openPanel();
  };

  const selectCreator = (index: number) => {
    const creator = creatorOptions[index];

    if (!creator) {
      return;
    }

    onSelectCreator(creator.id);
    closePanel();
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown" ||
      event.key === "ArrowUp"
    ) {
      event.preventDefault();
      openPanel();
    }
  };

  const handleListboxKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => getNextIndex(index, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => getNextIndex(index, -1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(creatorOptions.length - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCreator(activeIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel({ restoreFocus: true });
      return;
    }

    if (event.key === "Tab") {
      closePanel();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      closePanel();
    };

    const handleWindowChange = () => updatePanelPosition();

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePanelPosition();
    requestFrame(() => panelRef.current?.focus());
  }, [isOpen, collapsed]);

  const triggerContent: ReactNode = collapsed ? (
    <span className="relative z-20 flex h-full w-full items-center justify-center">
      <span className="text-sm font-semibold text-neutral-950">
        {selectedCreator.name.slice(0, 1)}
      </span>
    </span>
  ) : (
    <span className="relative z-20 flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-semibold text-neutral-950">
          {selectedCreator.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500">
          {selectedCreator.handle} · {selectedCreator.domain}
        </span>
      </span>
      <CaretDown
        className={cn(
          "h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200",
          isOpen && "rotate-180",
        )}
        weight={phosphorIconWeight}
      />
    </span>
  );

  return (
    <LayoutGroup id={`creator-account-notch-${reactId}`}>
      <div
        className={cn(collapsed ? "flex justify-center" : "px-1")}
        data-testid="creator-account-notch"
      >
        {collapsed ? null : (
          <p className="mb-2 px-3 text-xs font-semibold text-neutral-500">
            创作者账号
          </p>
        )}
        <MagneticButton
          className={cn("block", collapsed ? "h-11 w-11" : "w-full")}
          disabled={isOpen}
          strength={collapsed ? 0.2 : 0.12}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={
              collapsed ? `切换创作者账号：${selectedCreator.name}` : undefined
            }
            className={cn(
              "group relative isolate flex w-full overflow-hidden border border-neutral-200 text-left outline-none transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
              collapsed
                ? "h-11 items-center justify-center rounded-xl"
                : "h-14 items-center rounded-xl px-3",
              isOpen ? "shadow-sm" : "shadow-[0_1px_8px_rgba(24,24,27,0.06)]",
            )}
            data-testid={
              collapsed
                ? "creator-account-notch-trigger-collapsed"
                : "creator-account-notch-trigger"
            }
            onClick={togglePanel}
            onKeyDown={handleTriggerKeyDown}
          >
            {isOpen ? (
              <span
                className="absolute inset-0 z-0 rounded-xl bg-white/70"
                aria-hidden="true"
              />
            ) : (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 z-0 rounded-xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                transition={transition}
                aria-hidden="true"
              />
            )}
            <span
              className="pointer-events-none absolute inset-px z-10 rounded-[11px] border border-white/70"
              aria-hidden="true"
            />
            {triggerContent}
          </button>
        </MagneticButton>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  className="fixed z-[95]"
                  style={{
                    left: panelPosition.left,
                    top: panelPosition.top,
                    width: panelPosition.width,
                  }}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: panelPosition.placement === "above" ? 8 : -8,
                          scale: 0.96,
                        }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={transition}
                >
                  <motion.div
                    layoutId={layoutId}
                    className="relative overflow-visible rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_rgba(24,24,27,0.18)]"
                    transition={transition}
                  >
                    <span
                      className={cn(
                        "absolute left-1/2 h-3 w-12 -translate-x-1/2 border-neutral-200 bg-white",
                        panelPosition.placement === "above"
                          ? "-bottom-2 rounded-b-full border-x border-b"
                          : "-top-2 rounded-t-full border-x border-t",
                      )}
                      aria-hidden="true"
                    />
                    <CreatorAccountListbox
                      activeIndex={activeIndex}
                      activeOptionId={activeOptionId}
                      listboxId={listboxId}
                      onActiveIndexChange={setActiveIndex}
                      onKeyDown={handleListboxKeyDown}
                      onSelectIndex={selectCreator}
                      panelRef={panelRef}
                      selectedCreatorId={selectedCreator.id}
                    />
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </LayoutGroup>
  );
};
