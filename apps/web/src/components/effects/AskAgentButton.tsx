import { Sparkle } from "@phosphor-icons/react/Sparkle";

import { cn } from "@creator/ui";

import { PhosphorHoverIcon } from "../ui/PhosphorHoverIcon";

const AceternityLogo = () => (
  <svg
    width="66"
    height="65"
    viewBox="0 0 66 65"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-3 w-3 text-black"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
      stroke="currentColor"
      strokeWidth="15"
      strokeMiterlimit="3.86874"
      strokeLinecap="round"
    />
  </svg>
);

export const HoverBorderGradientButton = ({ ariaLabel, onClick }: { ariaLabel: string; onClick: () => void }) => (
  <button
    type="button"
    className={cn(
      "group/ask relative inline-flex h-[34px] w-fit items-center justify-center overflow-hidden rounded-full border bg-black/20 p-px decoration-clone shadow-[0_6px_18px_rgba(24,24,27,0.10)] transition duration-300 hover:bg-black/10 hover:shadow-[0_10px_24px_rgba(24,24,27,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
    )}
    aria-label={ariaLabel}
    data-testid="ask-agent-primary"
    onClick={onClick}
  >
    <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(75%_181.15942028985506%_at_50%_50%,#3275F8_0%,rgba(255,255,255,0)_100%)] opacity-0 blur-[2px] transition duration-300 group-hover/ask:opacity-100 group-focus-visible/ask:opacity-100" />
    <span className="absolute inset-[2px] z-[1] rounded-full bg-white" />
    <span className="type-control-compact-tight relative z-10 flex h-full w-auto items-center gap-1.5 rounded-[inherit] bg-white px-3 text-black">
      <AceternityLogo />
      <span className="whitespace-nowrap">询问 AI</span>
    </span>
  </button>
);

export const MiniAskButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    className="phosphor-hover-root absolute right-3 top-3 z-10 flex h-8 w-8 translate-y-1 items-center justify-center rounded-lg border border-violet-100 bg-white text-violet-600 opacity-0 shadow-sm transition group-hover/row:translate-y-0 group-hover/row:opacity-100 group-focus-within/row:translate-y-0 group-focus-within/row:opacity-100 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
    aria-label={`询问 AI Agent：${label}`}
    onClick={onClick}
  >
    <PhosphorHoverIcon className="h-3.5 w-3.5" icon={Sparkle} />
  </button>
);
