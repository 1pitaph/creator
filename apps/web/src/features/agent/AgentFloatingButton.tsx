import { ChatText } from "@phosphor-icons/react/ChatText";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { WarningCircle } from "@phosphor-icons/react/WarningCircle";

import { MagneticButton, cn } from "@creator/ui";

import { phosphorIconWeight } from "../../constants";

export const AgentFloatingButton = ({
  hasPendingApproval = false,
  isChatting = false,
  open,
  onOpen,
}: {
  hasPendingApproval?: boolean;
  isChatting?: boolean;
  open: boolean;
  onOpen: () => void;
}) => {
  const statusText = hasPendingApproval
    ? "有操作等待确认"
    : isChatting
      ? "正在分析模块"
      : "随时唤起数据助手";

  return (
    <div
      className={cn(
        "group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[60] h-14 w-14 md:bottom-6 md:right-6",
        open && "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-xs shadow-[0_14px_40px_rgba(24,24,27,0.14)] transition duration-200 md:block",
          open
            ? "opacity-0"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
        aria-hidden="true"
      >
        <p className="font-semibold text-zinc-950">AI Agent</p>
        <p className="mt-0.5 whitespace-nowrap text-zinc-500">{statusText}</p>
      </div>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-[calc(100%+0.35rem)] h-px w-11 -translate-x-1/2 border-t border-dashed border-zinc-500/70 transition-opacity duration-200",
          open ? "opacity-0" : "opacity-75",
        )}
        aria-hidden="true"
      />
      <MagneticButton
        className="block h-14 w-14"
        disabled={open}
        strength={0.24}
      >
        <button
          type="button"
          className={cn(
            "group relative flex h-14 w-14 items-center justify-center rounded-full border border-zinc-900 bg-zinc-950 text-white shadow-[0_18px_48px_rgba(24,24,27,0.26)] transition duration-200 hover:bg-zinc-800 hover:shadow-[0_22px_54px_rgba(24,24,27,0.30)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400",
            open && "translate-y-2 scale-95 opacity-0",
          )}
          aria-expanded={open}
          aria-label={`打开 AI Agent，${statusText}`}
          data-testid="agent-floating-button"
          onClick={onOpen}
        >
          <span className="pointer-events-none absolute inset-1 rounded-full border border-white/10" />
          {isChatting ? (
            <CircleNotch
              className="h-6 w-6 animate-spin"
              weight={phosphorIconWeight}
            />
          ) : (
            <ChatText className="h-6 w-6" weight={phosphorIconWeight} />
          )}
          <span
            className={cn(
              "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-950 bg-emerald-400",
              hasPendingApproval && "h-5 w-5 bg-amber-400 text-zinc-950",
            )}
            aria-hidden="true"
          >
            {hasPendingApproval ? (
              <WarningCircle className="h-3.5 w-3.5" weight="fill" />
            ) : null}
          </span>
        </button>
      </MagneticButton>
    </div>
  );
};
