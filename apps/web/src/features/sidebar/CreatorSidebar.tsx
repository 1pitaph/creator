import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { List } from "@phosphor-icons/react/List";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { X } from "@phosphor-icons/react/X";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import { type ReactNode, useState } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";

import { lifecycleLabels, phosphorIconWeight } from "../../constants";
import { creatorOptions } from "../creator-diagnosis/creatorOptions";
import { agentNavIcon, sidebarNavItems } from "./navItems";

export const CreatorSidebar = ({
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onOpenAgent
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onOpenAgent: () => void;
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileSidebar = () => setIsMobileOpen(false);
  const openAgentFromSidebar = () => {
    closeMobileSidebar();
    onOpenAgent();
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-100/95 px-4 backdrop-blur md:hidden">
        <SidebarBrand className="px-0" />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          aria-label="打开侧边栏"
          aria-expanded={isMobileOpen}
          data-testid="mobile-sidebar-trigger"
          onClick={() => setIsMobileOpen(true)}
        >
          <List className="h-5 w-5" weight={phosphorIconWeight} />
        </button>
      </div>

      <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 border-r border-neutral-200 bg-neutral-100 md:flex" data-testid="creator-sidebar-desktop">
        <SidebarContent
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
          onOpenAgent={onOpenAgent}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[70] bg-zinc-950/25 transition duration-300 md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isMobileOpen}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileSidebar();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileSidebar();
          }
        }}
      >
        <div
          className={cn(
            "relative z-10 flex h-dvh w-[min(330px,calc(100vw-28px))] transform flex-col border-r border-neutral-200 bg-neutral-100 shadow-2xl transition duration-300",
            isMobileOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
          )}
          data-testid="creator-sidebar-mobile"
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4">
            <SidebarBrand className="px-0" />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
              aria-label="关闭侧边栏"
              onClick={closeMobileSidebar}
            >
              <X className="pointer-events-none h-4 w-4" weight={phosphorIconWeight} />
            </button>
          </div>
          <SidebarContent
            className="min-h-0 flex-1 pt-2"
            showBrand={false}
            selectedCreatorId={selectedCreatorId}
            onSelectCreator={(creatorId) => {
              onSelectCreator(creatorId);
              closeMobileSidebar();
            }}
            diagnosis={diagnosis}
            isLoadingDiagnosis={isLoadingDiagnosis}
            onOpenAgent={openAgentFromSidebar}
            onNavigate={closeMobileSidebar}
          />
        </div>
      </div>
    </>
  );
};

const SidebarContent = ({
  className,
  showBrand = true,
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onOpenAgent,
  onNavigate
}: {
  className?: string;
  showBrand?: boolean;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onOpenAgent: () => void;
  onNavigate?: () => void;
}) => (
  <div className={cn("flex h-full w-full flex-col overflow-hidden px-4 py-4", className)}>
    {showBrand ? <SidebarBrand /> : null}

    <ScrollArea.Root className={cn("min-h-0 flex-1", showBrand ? "mt-7" : "mt-0")}>
      <ScrollArea.Viewport className="h-full pr-1">
        <CreatorAccountSelect selectedCreatorId={selectedCreatorId} onSelectCreator={onSelectCreator} />

        <div className="mt-6">
          <SidebarNav onOpenAgent={onOpenAgent} onNavigate={onNavigate} />
        </div>

        <SidebarDivider />

        <CreatorMiniCard diagnosis={diagnosis} />
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-0.5" orientation="vertical">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-300" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>

    <SidebarFooter diagnosis={diagnosis} isLoadingDiagnosis={isLoadingDiagnosis} />
  </div>
);

const SidebarBrand = ({ className }: { className?: string }) => (
  <div className={cn("relative z-20 flex items-center gap-2 px-4 py-1 text-sm text-neutral-950", className)}>
    <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-black text-white">
      <Sparkle className="h-3.5 w-3.5" weight={phosphorIconWeight} />
    </div>
    <div className="min-w-0">
      <p className="truncate font-medium leading-5 text-neutral-950">Creator AI</p>
      <p className="truncate text-xs leading-4 text-neutral-500">抖音创作者中心 Demo</p>
    </div>
  </div>
);

const CreatorAccountSelect = ({
  selectedCreatorId,
  onSelectCreator
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
}) => (
  <div className="px-1">
    <p className="mb-2 px-3 text-xs font-semibold text-neutral-500">创作者账号</p>
    <Select.Root value={selectedCreatorId} onValueChange={onSelectCreator}>
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm font-medium text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition hover:bg-white focus:ring-2 focus:ring-neutral-300">
        <Select.Value />
        <Select.Icon>
          <CaretDown className="h-4 w-4 text-neutral-500" weight={phosphorIconWeight} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-[90] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
          <Select.Viewport className="p-1">
            {creatorOptions.map((creator) => (
              <Select.Item
                key={creator.id}
                value={creator.id}
                className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-100 data-[state=checked]:font-semibold"
              >
                <Select.ItemText>
                  {creator.name} · {creator.domain}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>
);

const SidebarDivider = () => (
  <div className="my-4 px-4">
    <div className="h-px w-full bg-neutral-200" />
    <div className="h-px w-full bg-white" />
  </div>
);

const CreatorMiniCard = ({ diagnosis }: { diagnosis: DiagnosisResponse }) => (
  <div className="mx-1 rounded-xl border border-neutral-200 bg-white/65 p-3 shadow-[0_1px_1px_rgba(24,24,27,0.03),inset_0_1px_0_rgba(255,255,255,0.85)]">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-950">
        {diagnosis.creator.displayName.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">{diagnosis.creator.displayName}</p>
        <p className="truncate text-xs text-neutral-500">{diagnosis.creator.handle}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      <Badge tone="blue" className="bg-sky-50/80">
        {diagnosis.creator.domain}
      </Badge>
      <Badge tone="neutral" className="bg-neutral-100/80">
        {lifecycleLabels[diagnosis.creator.lifecycle]}
      </Badge>
    </div>
  </div>
);

const SidebarFooter = ({ diagnosis, isLoadingDiagnosis }: { diagnosis: DiagnosisResponse; isLoadingDiagnosis: boolean }) => (
  <div className="mt-4 border-t border-neutral-200 pt-4">
    <div className="group/sidebar flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-neutral-200/80">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
        {diagnosis.creator.displayName.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800 transition duration-150 group-hover/sidebar:translate-x-1">
          {diagnosis.creator.displayName}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {isLoadingDiagnosis ? "画像同步中" : "AI 模块在线"} · {diagnosis.modules.length} tools
        </p>
      </div>
    </div>
  </div>
);

const SidebarNav = ({ onOpenAgent, onNavigate }: { onOpenAgent: () => void; onNavigate?: () => void }) => (
  <nav className="flex flex-col gap-1">
    {sidebarNavItems.map((item) => (
      <SidebarLinkItem key={item.label} label={item.label} active={item.active} icon={item.icon} onClick={onNavigate} />
    ))}
    <SidebarLinkItem label="AI Agent" icon={agentNavIcon} onClick={onOpenAgent} />
  </nav>
);

const SidebarLinkItem = ({
  label,
  icon,
  active,
  onClick
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) => {
  const [isIntent, setIsIntent] = useState(false);

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className="group/sidebar relative w-full px-4 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
      onClick={onClick}
      onFocus={() => setIsIntent(true)}
      onBlur={() => setIsIntent(false)}
      onMouseDown={() => setIsIntent(true)}
      onMouseEnter={() => setIsIntent(true)}
      onMouseLeave={() => setIsIntent(false)}
      onPointerEnter={() => setIsIntent(true)}
      onPointerLeave={() => setIsIntent(false)}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-lg bg-neutral-200 transition-opacity duration-150 ease-out",
          active || isIntent ? "opacity-100" : "opacity-0 group-focus/sidebar:opacity-100 group-hover/sidebar:opacity-100"
        )}
      />
      <span className="relative z-20 flex items-center justify-start gap-2 py-2">
        <span className="shrink-0 text-neutral-700 transition-colors duration-150">{icon}</span>
        <span
          className={cn(
            "inline-block whitespace-pre text-sm font-medium transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
            isIntent && "translate-x-1",
            "text-neutral-700"
          )}
        >
          {label}
        </span>
      </span>
    </button>
  );
};
