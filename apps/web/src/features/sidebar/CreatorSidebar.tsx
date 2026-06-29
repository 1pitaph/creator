import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { List } from "@phosphor-icons/react/List";
import { PlusSquare } from "@phosphor-icons/react/PlusSquare";
import { X } from "@phosphor-icons/react/X";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import Avatar from "boring-avatars";
import { type ReactNode, useEffect, useState } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";
import { cn } from "@creator/ui";

import { PhosphorHoverIcon } from "../../components/ui/PhosphorHoverIcon";
import type { DashboardPanel } from "../../types";
import { CreatorAccountNotchSelect } from "./CreatorAccountNotchSelect";
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

const navItemIdByPanel = {
  board: "activity",
  overview: "home",
  table: "account-overview",
} satisfies Record<DashboardPanel, string>;

export const CreatorSidebar = ({
  selectedCreatorId,
  onSelectCreator,
  selectedPanel,
  onSelectPanel,
  diagnosis,
  isLoadingDiagnosis,
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  selectedPanel: DashboardPanel;
  onSelectPanel: (panel: DashboardPanel) => void;
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
          className="phosphor-hover-root flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          aria-label="打开侧边栏"
          aria-expanded={isMobileOpen}
          data-testid="mobile-sidebar-trigger"
          onClick={() => setIsMobileOpen(true)}
        >
          <PhosphorHoverIcon className="h-5 w-5" icon={List} />
        </button>
      </div>

      <aside
        className={cn(
          "group/sidebar-shell relative sticky top-0 z-40 hidden h-screen shrink-0 bg-neutral-100 transition-[width] duration-300 ease-in-out md:flex",
          isDesktopCollapsed ? "w-[72px]" : "w-[260px]",
        )}
        data-collapsed={isDesktopCollapsed}
        data-testid="creator-sidebar-desktop"
      >
        <button
          type="button"
          className="phosphor-hover-root pointer-events-none absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 opacity-0 shadow-sm transition hover:bg-neutral-100 group-hover/sidebar-shell:pointer-events-auto group-hover/sidebar-shell:opacity-100 group-focus-within/sidebar-shell:pointer-events-auto group-focus-within/sidebar-shell:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          aria-expanded={!isDesktopCollapsed}
          aria-label={isDesktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          title={isDesktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={() => setIsDesktopCollapsed((collapsed) => !collapsed)}
        >
          <PhosphorHoverIcon
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isDesktopCollapsed && "rotate-180",
            )}
            icon={CaretLeft}
          />
        </button>
        <SidebarContent
          collapsed={isDesktopCollapsed}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
          selectedPanel={selectedPanel}
          onSelectPanel={onSelectPanel}
          diagnosis={diagnosis}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 z-30 w-4 border-l border-r border-neutral-200/70 bg-white/50 bg-[repeating-linear-gradient(135deg,rgba(212,212,216,0.38)_0,rgba(212,212,216,0.38)_1px,transparent_1px,transparent_5px)]",
            isDesktopCollapsed ? "-right-4" : "right-0",
          )}
          data-testid="sidebar-boundary-strip"
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
              className="phosphor-hover-root flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
              aria-label="关闭侧边栏"
              onClick={closeMobileSidebar}
            >
              <PhosphorHoverIcon
                className="pointer-events-none h-4 w-4"
                icon={X}
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
            selectedPanel={selectedPanel}
            onSelectPanel={onSelectPanel}
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
  selectedPanel,
  onSelectPanel,
  diagnosis,
  isLoadingDiagnosis,
  onNavigate,
}: {
  className?: string;
  collapsed?: boolean;
  showBrand?: boolean;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  selectedPanel: DashboardPanel;
  onSelectPanel: (panel: DashboardPanel) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
  onNavigate?: () => void;
}) => {
  const handlePublish = () => {
    onNavigate?.();
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-visible py-4",
        collapsed ? "px-2" : "px-4",
        className,
      )}
      data-testid="sidebar-content"
    >
      {showBrand ? <SidebarBrand collapsed={collapsed} /> : null}

      <SidebarPublishButton
        collapsed={collapsed}
        className={showBrand ? "mt-7" : "mt-0"}
        onClick={handlePublish}
      />

      <ScrollArea.Root className="mt-7 min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport
          className={cn(
            "h-full scroll-isolated",
            collapsed ? "pr-0" : "pr-1",
          )}
          data-testid="sidebar-nav-scroll-viewport"
        >
          <div>
            <SidebarNav
              collapsed={collapsed}
              selectedPanel={selectedPanel}
              onSelectPanel={onSelectPanel}
              onNavigate={onNavigate}
            />
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <div className={cn("mt-4", collapsed && "mt-3")}>
        <CreatorAccountNotchSelect
          collapsed={collapsed}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
        />
      </div>

      <SidebarFooter
        collapsed={collapsed}
        diagnosis={diagnosis}
        isLoadingDiagnosis={isLoadingDiagnosis}
      />
    </div>
  );
};

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

const SidebarPublishButton = ({
  className,
  collapsed = false,
  onClick,
}: {
  className?: string;
  collapsed?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={cn(
      "phosphor-hover-root group/publish flex h-10 items-center justify-center rounded-lg bg-[#fe2c55] text-white shadow-[0_12px_24px_rgba(254,44,85,0.18)] transition hover:bg-[#f12850] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]",
      collapsed ? "w-full px-0" : "ml-2 mr-3 w-[calc(100%-20px)] gap-2 px-3",
      className,
    )}
    aria-label="高清发布"
    title={collapsed ? "高清发布" : undefined}
    data-testid="sidebar-publish-button"
    onClick={onClick}
  >
    <PhosphorHoverIcon className="h-5 w-5 shrink-0" icon={PlusSquare} />
    <span className={cn("text-sm font-semibold", collapsed && "sr-only")}>
      高清发布
    </span>
    <PhosphorHoverIcon
      className={cn(
        "ml-auto h-4 w-4 shrink-0 transition group-hover/publish:translate-y-0.5",
        collapsed && "hidden",
      )}
      icon={CaretDown}
    />
  </button>
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
    data-testid="sidebar-footer"
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
  selectedPanel,
  onSelectPanel,
  onNavigate,
}: {
  collapsed?: boolean;
  selectedPanel: DashboardPanel;
  onSelectPanel: (panel: DashboardPanel) => void;
  onNavigate?: () => void;
}) => {
  const [activeItemId, setActiveItemId] = useState(
    () => navItemIdByPanel[selectedPanel],
  );
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>(() =>
    sidebarNavItems.reduce<Record<string, boolean>>((groups, item) => {
      if (item.kind === "group" && item.defaultOpen) {
        groups[item.id] = true;
      }

      return groups;
    }, {}),
  );

  useEffect(() => {
    setActiveItemId(navItemIdByPanel[selectedPanel]);
  }, [selectedPanel]);

  return (
    <nav className="flex flex-col" aria-label="创作者中心导航">
      {sidebarNavItems.map((item) => {
        if (item.kind === "leaf") {
          return (
            <SidebarLinkItem
              key={item.id}
              collapsed={collapsed}
              label={item.label}
              active={activeItemId === item.id}
              icon={item.icon}
              separated={item.separated}
              onClick={() => {
                setActiveItemId(item.id);
                onSelectPanel(item.panel);
                onNavigate?.();
              }}
            />
          );
        }

        const open = Boolean(openGroupIds[item.id]);
        const active = item.children.some((child) => child.id === activeItemId);

        return (
          <SidebarGroupItem
            key={item.id}
            active={active}
            collapsed={collapsed}
            icon={item.icon}
            itemId={item.id}
            label={item.label}
            open={open}
            separated={item.separated}
            onToggle={() => {
              setOpenGroupIds((groupIds) => ({
                ...groupIds,
                [item.id]: !groupIds[item.id],
              }));
            }}
          >
            {item.children.map((child) => (
              <SidebarChildLink
                key={child.id}
                active={activeItemId === child.id}
                label={child.label}
                onClick={() => {
                  setActiveItemId(child.id);
                  if (child.panel) {
                    onSelectPanel(child.panel);
                  }
                  onNavigate?.();
                }}
              />
            ))}
          </SidebarGroupItem>
        );
      })}
    </nav>
  );
};

const SidebarLinkItem = ({
  collapsed = false,
  label,
  icon,
  active,
  separated = false,
  onClick,
}: {
  collapsed?: boolean;
  label: string;
  icon: ReactNode;
  active?: boolean;
  separated?: boolean;
  onClick?: () => void;
}) => {
  const [isIntent, setIsIntent] = useState(false);

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "phosphor-hover-root group/sidebar relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
        collapsed ? "w-full px-0 text-center" : "mx-2 w-[calc(100%-16px)] px-2 text-left",
        separated && "mt-3 border-t border-neutral-200 pt-3",
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
          "pointer-events-none absolute inset-x-0 z-10 rounded-lg bg-neutral-200 transition-opacity duration-150 ease-out",
          separated ? "top-3 bottom-0" : "inset-y-0",
          active || isIntent
            ? "opacity-100"
            : "opacity-0 group-focus/sidebar:opacity-100 group-hover/sidebar:opacity-100",
        )}
      />
      <span
        className={cn(
          "relative z-20 flex h-10 items-center gap-3",
          collapsed ? "justify-center" : "justify-start",
        )}
      >
        <span
          className={cn(
            "shrink-0 transition-colors duration-150",
            active ? "text-neutral-900" : "text-neutral-500",
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "inline-block whitespace-pre text-sm font-medium transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
            isIntent && "translate-x-1",
            active ? "text-neutral-950" : "text-neutral-500",
            collapsed && "sr-only",
          )}
        >
          {label}
        </span>
      </span>
    </button>
  );
};

const SidebarGroupItem = ({
  active = false,
  children,
  collapsed = false,
  icon,
  itemId,
  label,
  open,
  separated = false,
  onToggle,
}: {
  active?: boolean;
  children: ReactNode;
  collapsed?: boolean;
  icon: ReactNode;
  itemId: string;
  label: string;
  open: boolean;
  separated?: boolean;
  onToggle: () => void;
}) => {
  const [isIntent, setIsIntent] = useState(false);

  return (
    <div className={cn(separated && "mt-3 border-t border-neutral-200 pt-3")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`sidebar-group-${itemId}`}
        className={cn(
          "phosphor-hover-root group/sidebar relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
          collapsed ? "w-full px-0 text-center" : "mx-2 w-[calc(100%-16px)] px-2 text-left",
        )}
        title={collapsed ? label : undefined}
        data-testid={`sidebar-nav-group-${itemId}`}
        onClick={onToggle}
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
            "relative z-20 flex h-10 items-center gap-3",
            collapsed ? "justify-center" : "justify-start",
          )}
        >
          <span
            className={cn(
              "shrink-0 transition-colors duration-150",
              active ? "text-neutral-900" : "text-neutral-500",
            )}
          >
            {icon}
          </span>
          <span
            className={cn(
              "inline-block whitespace-pre text-sm font-medium transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
              isIntent && "translate-x-1",
              active ? "text-neutral-950" : "text-neutral-500",
              collapsed && "sr-only",
            )}
          >
            {label}
          </span>
          <PhosphorHoverIcon
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200",
              open && "rotate-180",
              collapsed && "hidden",
            )}
            icon={CaretDown}
          />
        </span>
      </button>

      {open && !collapsed ? (
        <div
          id={`sidebar-group-${itemId}`}
          className="flex flex-col py-1.5"
          data-testid={`sidebar-nav-children-${itemId}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

const SidebarChildLink = ({
  active = false,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-current={active ? "page" : undefined}
    className={cn(
      "mx-2 h-9 w-[calc(100%-16px)] rounded-lg pl-[52px] pr-3 text-left text-sm font-normal transition hover:bg-neutral-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
      active ? "bg-neutral-200 text-neutral-950" : "text-neutral-500",
    )}
    onClick={onClick}
  >
    {label}
  </button>
);
