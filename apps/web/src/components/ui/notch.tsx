import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@creator/ui";

export type NotchOption = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
};

export type NotchItem = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  options: NotchOption[];
  defaultValue?: string;
  value?: string;
  triggerValue?: React.ReactNode;
  triggerValueClassName?: string;
  showValue?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onChange?: (optionId: string, option: NotchOption) => void;
};

export interface NotchProps {
  items: NotchItem[];
  position?: "top" | "bottom";
  align?: "start" | "center" | "end";
  onItemChange?: (
    itemId: string,
    optionId: string,
    option: NotchOption,
  ) => void;
  closeOnSelect?: boolean;
  showSelectedValue?: boolean;
  showDividers?: boolean;
  accentColor?: string;
  offset?: number;
  reveal?: boolean;
  className?: string;
  rootClassName?: string;
  itemClassName?: string;
  panelClassName?: string;
  optionsListClassName?: string;
}

const SHELL_AXIS_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
};
const SHELL_AXIS_TWEEN = {
  type: "tween" as const,
  duration: 0.16,
  ease: "easeOut" as const,
};
const SELECTED_STATE_FADE_DURATION = 0.1;
const SELECTED_STATE_FADE = {
  duration: SELECTED_STATE_FADE_DURATION,
  ease: "easeOut" as const,
};
const SHELL_CLOSE_HEIGHT_DELAY = SELECTED_STATE_FADE_DURATION;
const SHELL_CLOSE_WIDTH_DELAY =
  SELECTED_STATE_FADE_DURATION + SHELL_AXIS_TWEEN.duration;

const getShellTransition = (isOpen: boolean) => ({
  opacity: { duration: 0.15 },
  y: SHELL_AXIS_SPRING,
  filter: { duration: 0.15 },
  width: isOpen
    ? SHELL_AXIS_SPRING
    : { ...SHELL_AXIS_TWEEN, delay: SHELL_CLOSE_WIDTH_DELAY },
  height: isOpen
    ? SHELL_AXIS_SPRING
    : { ...SHELL_AXIS_TWEEN, delay: SHELL_CLOSE_HEIGHT_DELAY },
});

const LIST_VARIANTS = {
  hidden: {
    transition: {
      staggerChildren: 0.045,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.08 },
  },
};

const OPTION_VARIANTS = {
  hidden: {
    opacity: 0,
    y: -10,
    filter: "blur(4px)",
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 30,
      delay: SELECTED_STATE_FADE_DURATION,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 420, damping: 30 },
  },
};

const SELECTED_STATE_VARIANTS = {
  hidden: { opacity: 0, transition: SELECTED_STATE_FADE },
  visible: {
    opacity: 1,
    transition: { duration: 0.12, ease: "easeOut" as const },
  },
};

const labelToString = (label: React.ReactNode, fallback: string) =>
  typeof label === "string" ? label : fallback;

const toStableSize = ({ height, width }: DOMRect) => ({
  height: Math.ceil(height),
  width: Math.ceil(width),
});

const NotchDivider = () => (
  <span
    aria-hidden="true"
    className="mx-0.5 h-5 w-px shrink-0 self-center"
    data-testid="notch-divider"
    style={{
      backgroundImage:
        "repeating-linear-gradient(180deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 1px, transparent 1px, transparent 5px)",
      backgroundRepeat: "repeat-y",
      backgroundSize: "1px 4px",
    }}
  />
);

const NotchOptionsPanel = ({
  accentColor,
  activeId,
  item,
  optionsListClassName,
  onSelect,
}: {
  accentColor: string;
  activeId?: string;
  item: NotchItem;
  optionsListClassName?: string;
  onSelect: (option: NotchOption) => void;
}) => (
  <div className={cn("flex flex-col gap-1.5 p-2", optionsListClassName)}>
    {item.options.map((option) => {
      const active = option.id === activeId;

      return (
        <motion.button
          key={option.id}
          role="option"
          aria-selected={active}
          type="button"
          variants={OPTION_VARIANTS}
          onClick={() => onSelect(option)}
          className={cn(
            "relative flex w-full items-center justify-between gap-6 overflow-hidden rounded-md px-3 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors",
            active
              ? "text-white"
              : "text-neutral-300 hover:bg-white/5 hover:text-white",
          )}
        >
          {active ? (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-md"
              variants={SELECTED_STATE_VARIANTS}
              style={{
                background: `color-mix(in oklab, ${accentColor} 85%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accentColor} 40%, transparent)`,
              }}
            />
          ) : null}
          <span className="relative z-10 flex items-center gap-2.5">
            {option.icon ? (
              <span className="flex shrink-0 items-center justify-center">
                {option.icon}
              </span>
            ) : null}
            <span>{option.label}</span>
          </span>
          {active ? (
            <motion.span
              className="relative z-10 size-1.5 shrink-0 rounded-full"
              variants={SELECTED_STATE_VARIANTS}
              style={{ background: accentColor }}
            />
          ) : null}
        </motion.button>
      );
    })}
  </div>
);

export const Notch = ({
  items,
  position = "bottom",
  align = "center",
  onItemChange,
  closeOnSelect = true,
  showSelectedValue = true,
  showDividers = true,
  accentColor = "var(--color-blue-500, #3b82f6)",
  offset = 16,
  reveal = true,
  className,
  rootClassName,
  itemClassName,
  panelClassName,
  optionsListClassName,
}: NotchProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [shellSize, setShellSize] = useState<{
    height: number;
    width: number;
  } | null>(null);
  const [internalSelected, setInternalSelected] = useState<
    Record<string, string>
  >(() => {
    const map: Record<string, string> = {};

    for (const item of items) {
      if (item.value === undefined) {
        map[item.id] = item.defaultValue ?? item.options[0]?.id ?? "";
      }
    }

    return map;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenItemId(null);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!openItemId) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpenItemId(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openItemId]);

  const getSelectedId = (item: NotchItem) =>
    item.value ?? internalSelected[item.id] ?? item.options[0]?.id;

  const getSelectedOption = (item: NotchItem) =>
    item.options.find((option) => option.id === getSelectedId(item));

  const handleSelect = (item: NotchItem, option: NotchOption) => {
    if (item.value === undefined) {
      setInternalSelected((previous) => ({
        ...previous,
        [item.id]: option.id,
      }));
    }

    item.onChange?.(option.id, option);
    onItemChange?.(item.id, option.id, option);

    if (closeOnSelect) {
      setOpenItemId(null);
    }
  };

  const alignClass =
    align === "start"
      ? "justify-start"
      : align === "end"
        ? "justify-end"
        : "justify-center";

  const edgeOffset = (offset + 20) * (position === "top" ? -1 : 1);
  const openItem =
    items.find((item) => item.id === openItemId && !item.disabled) ?? null;
  const isOpen = Boolean(openItem);

  useLayoutEffect(() => {
    const node = contentRef.current;

    if (!node) {
      return undefined;
    }

    const measure = () => {
      const nextSize = toStableSize(node.getBoundingClientRect());

      setShellSize((previousSize) =>
        previousSize?.height === nextSize.height &&
        previousSize.width === nextSize.width
          ? previousSize
          : nextSize,
      );
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, items]);

  const optionsPanel = openItem ? (
    <motion.div
      ref={contentRef}
      key={openItem.id}
      role="listbox"
      aria-label={labelToString(openItem.label, openItem.id)}
      variants={LIST_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className={cn("w-fit", panelClassName)}
    >
      <NotchOptionsPanel
        accentColor={accentColor}
        activeId={getSelectedId(openItem)}
        item={openItem}
        optionsListClassName={optionsListClassName}
        onSelect={(option) => handleSelect(openItem, option)}
      />
    </motion.div>
  ) : (
    <motion.div
      ref={contentRef}
      key="__notch-triggers"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.14, duration: 0.12 } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="flex w-fit items-center gap-1 p-1"
      data-testid="notch-trigger-row"
    >
      {items.map((item, index) => {
        const selected = getSelectedOption(item);
        const isLast = index === items.length - 1;
        const triggerValue = item.triggerValue ?? selected?.label;
        const itemContent = (
          <>
            {item.icon ? (
              <span className="flex shrink-0 items-center justify-center">
                {item.icon}
              </span>
            ) : null}
            <span className="font-semibold text-neutral-100">
              {item.label}
            </span>
            {(item.showValue ?? showSelectedValue) && triggerValue ? (
              <span
                className={cn(
                  item.triggerValueClassName ?? "text-neutral-400",
                )}
              >
                {triggerValue}
              </span>
            ) : null}
          </>
        );

        return (
          <React.Fragment key={item.id}>
            {item.disabled ? (
              <div
                aria-label={item.ariaLabel}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-300",
                  itemClassName,
                )}
                data-testid={`notch-static-${item.id}`}
              >
                {itemContent}
              </div>
            ) : (
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={openItemId === item.id}
                aria-label={item.ariaLabel}
                data-testid={`notch-trigger-${item.id}`}
                onClick={() => setOpenItemId(item.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-300 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500",
                  itemClassName,
                )}
              >
                {itemContent}
              </button>
            )}
            {showDividers && !isLast ? <NotchDivider /> : null}
          </React.Fragment>
        );
      })}
    </motion.div>
  );

  const shell = (
    <motion.div
      ref={shellRef}
      initial={
        reveal ? { opacity: 0, y: edgeOffset, filter: "blur(6px)" } : false
      }
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        ...(shellSize
          ? { height: shellSize.height, width: shellSize.width }
          : null),
      }}
      transition={getShellTransition(isOpen)}
      className={cn(
        "pointer-events-auto relative flex w-fit flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55)] ring-1 ring-neutral-800 ring-inset backdrop-blur-2xl",
        className,
      )}
      data-testid="notch-shell"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {optionsPanel}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[100] flex transform-gpu px-4",
        position === "top" ? "top-0" : "bottom-0",
        alignClass,
        rootClassName,
      )}
      style={
        position === "top"
          ? { paddingTop: `max(${offset}px, env(safe-area-inset-top))` }
          : { paddingBottom: `max(${offset}px, env(safe-area-inset-bottom))` }
      }
    >
      {shell}
    </div>
  );
};
