import { CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { List } from "@phosphor-icons/react/List";
import { X } from "@phosphor-icons/react/X";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import Avatar from "boring-avatars";
import { type ReactNode, useState } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";

import { lifecycleLabels, phosphorIconWeight } from "../../constants";
import { creatorOptions } from "../creator-diagnosis/creatorOptions";
import { sidebarNavItems } from "./navItems";

const douyinLogoPath =
  "M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z";

const creatorAvatarColors = [
  "#25f4ee",
  "#fe2c55",
  "#18181b",
  "#e5e7eb",
  "#38bdf8",
];

export const CreatorSidebar = ({
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const closeMobileSidebar = () => setIsMobileOpen(false);

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

      <aside
        className={cn(
          "group/sidebar-shell sticky top-0 z-40 hidden h-screen shrink-0 border-r border-neutral-200 bg-neutral-100 shadow-[6px_0_18px_rgba(15,23,42,0.04)] transition-[width] duration-300 ease-in-out md:flex",
          isDesktopCollapsed ? "w-[72px]" : "w-[260px]",
        )}
        data-collapsed={isDesktopCollapsed}
        data-testid="creator-sidebar-desktop"
      >
        <button
          type="button"
          className="pointer-events-none absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 opacity-0 shadow-sm transition hover:bg-neutral-100 group-hover/sidebar-shell:pointer-events-auto group-hover/sidebar-shell:opacity-100 group-focus-within/sidebar-shell:pointer-events-auto group-focus-within/sidebar-shell:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          aria-expanded={!isDesktopCollapsed}
          aria-label={isDesktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          title={isDesktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={() => setIsDesktopCollapsed((collapsed) => !collapsed)}
        >
          <CaretLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isDesktopCollapsed && "rotate-180",
            )}
            weight={phosphorIconWeight}
          />
        </button>
        <SidebarContent
          collapsed={isDesktopCollapsed}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[70] bg-zinc-950/25 transition duration-300 md:hidden",
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
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
            isMobileOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0",
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
              <X
                className="pointer-events-none h-4 w-4"
                weight={phosphorIconWeight}
              />
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
            onNavigate={closeMobileSidebar}
          />
        </div>
      </div>
    </>
  );
};

const SidebarContent = ({
  className,
  collapsed = false,
  showBrand = true,
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onNavigate,
}: {
  className?: string;
  collapsed?: boolean;
  showBrand?: boolean;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onNavigate?: () => void;
}) => (
  <div
    className={cn(
      "flex h-full w-full flex-col overflow-hidden py-4",
      collapsed ? "px-2" : "px-4",
      className,
    )}
  >
    {showBrand ? <SidebarBrand collapsed={collapsed} /> : null}

    <ScrollArea.Root
      className={cn("min-h-0 flex-1", showBrand ? "mt-7" : "mt-0")}
    >
      <ScrollArea.Viewport
        className={cn("h-full", collapsed ? "pr-0" : "pr-1")}
      >
        {collapsed ? null : (
          <CreatorAccountSelect
            selectedCreatorId={selectedCreatorId}
            onSelectCreator={onSelectCreator}
          />
        )}

        <div className={collapsed ? "mt-0" : "mt-6"}>
          <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
        </div>

        {collapsed ? null : <SidebarDivider />}

        {collapsed ? null : <CreatorMiniCard diagnosis={diagnosis} />}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className="flex w-2.5 touch-none select-none bg-transparent p-0.5"
        orientation="vertical"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-300" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>

    <SidebarFooter
      collapsed={collapsed}
      diagnosis={diagnosis}
      isLoadingDiagnosis={isLoadingDiagnosis}
    />
  </div>
);

const SidebarBrand = ({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) => (
  <div
    className={cn(
      "relative z-20 flex items-center gap-2 py-1 text-sm text-neutral-950",
      collapsed ? "justify-center px-0" : "px-4",
      className,
    )}
  >
    <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-black text-white">
      <DouyinLogoMark />
    </div>
    <div className={cn("min-w-0", collapsed && "hidden")}>
      <p className="truncate font-medium leading-5 text-neutral-950">
        Creator AI
      </p>
      <p className="truncate text-xs leading-4 text-neutral-500">
        抖音创作者中心 Demo
      </p>
    </div>
  </div>
);

const DouyinLogoMark = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5 overflow-visible"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path d={douyinLogoPath} fill="#25f4ee" transform="translate(-1 1)" />
    <path d={douyinLogoPath} fill="#fe2c55" transform="translate(1 -1)" />
    <path d={douyinLogoPath} fill="currentColor" />
  </svg>
);

const CreatorAccountSelect = ({
  selectedCreatorId,
  onSelectCreator,
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
}) => (
  <div className="px-1">
    <p className="mb-2 px-3 text-xs font-semibold text-neutral-500">
      创作者账号
    </p>
    <Select.Root value={selectedCreatorId} onValueChange={onSelectCreator}>
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white/80 px-3 text-sm font-medium text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition hover:bg-white focus:ring-2 focus:ring-neutral-300">
        <Select.Value />
        <Select.Icon>
          <CaretDown
            className="h-4 w-4 text-neutral-500"
            weight={phosphorIconWeight}
          />
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
        <p className="truncate text-sm font-semibold text-neutral-950">
          {diagnosis.creator.displayName}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {diagnosis.creator.handle}
        </p>
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

const SidebarFooter = ({
  collapsed = false,
  diagnosis,
  isLoadingDiagnosis,
}: {
  collapsed?: boolean;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
}) => (
  <div
    className={cn(
      "mt-4 border-t border-neutral-200 pt-4",
      collapsed && "flex justify-center",
    )}
  >
    <div
      className={cn(
        "group/sidebar flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-neutral-200/80",
        collapsed && "h-11 justify-center px-0",
      )}
      title={collapsed ? diagnosis.creator.displayName : undefined}
    >
      <SidebarFooterAvatar seed={diagnosis.creator.id} />
      <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
        <p className="truncate text-sm font-medium text-neutral-800 transition duration-150 group-hover/sidebar:translate-x-1">
          {diagnosis.creator.displayName}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {isLoadingDiagnosis ? "画像同步中" : "AI 模块在线"} ·{" "}
          {diagnosis.modules.length} tools
        </p>
      </div>
    </div>
  </div>
);

const SidebarFooterAvatar = ({ seed }: { seed: string }) => (
  <span
    aria-hidden="true"
    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-300/80"
    data-testid="sidebar-footer-avatar"
  >
    <Avatar
      aria-hidden="true"
      className="block h-8 w-8"
      colors={creatorAvatarColors}
      data-avatar-seed={seed}
      data-testid="sidebar-footer-avatar-svg"
      focusable="false"
      name={seed}
      role="presentation"
      size={32}
      title={false}
      variant="beam"
    />
  </span>
);

const SidebarNav = ({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) => (
  <nav className="flex flex-col gap-1">
    {sidebarNavItems.map((item) => (
      <SidebarLinkItem
        key={item.label}
        collapsed={collapsed}
        label={item.label}
        active={item.active}
        icon={item.icon}
        onClick={onNavigate}
      />
    ))}
  </nav>
);

const SidebarLinkItem = ({
  collapsed = false,
  label,
  icon,
  active,
  onClick,
}: {
  collapsed?: boolean;
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
      className={cn(
        "group/sidebar relative w-full py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
        collapsed ? "px-0 text-center" : "px-4 text-left",
      )}
      title={collapsed ? label : undefined}
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
          active || isIntent
            ? "opacity-100"
            : "opacity-0 group-focus/sidebar:opacity-100 group-hover/sidebar:opacity-100",
        )}
      />
      <span
        className={cn(
          "relative z-20 flex items-center gap-2 py-2",
          collapsed ? "justify-center" : "justify-start",
        )}
      >
        <span className="shrink-0 text-neutral-700 transition-colors duration-150">
          {icon}
        </span>
        <span
          className={cn(
            "inline-block whitespace-pre text-sm font-medium transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
            isIntent && "translate-x-1",
            "text-neutral-700",
            collapsed && "sr-only",
          )}
        >
          {label}
        </span>
      </span>
    </button>
  );
};
