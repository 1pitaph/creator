import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { Article } from "@phosphor-icons/react/Article";
import { Image } from "@phosphor-icons/react/Image";
import { List } from "@phosphor-icons/react/List";
import { Panorama } from "@phosphor-icons/react/Panorama";
import { PlusSquare } from "@phosphor-icons/react/PlusSquare";
import { Video } from "@phosphor-icons/react/Video";
import { X } from "@phosphor-icons/react/X";
import Avatar from "boring-avatars";
import { useEffect, useRef, useState } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";
import { cn } from "@creator/ui";

import { PhosphorHoverIcon } from "../../components/ui/PhosphorHoverIcon";
import { phosphorIconWeight } from "../../constants";
import type { CreatorRouteId } from "../navigation/creatorRoutes";
import { CreatorAccountNotchSelect } from "./CreatorAccountNotchSelect";
import { CreatorSidebarNav } from "./CreatorSidebarNav";

const douyinLogoPath =
  "M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z";

const creatorAvatarColors = [
  "#25f4ee",
  "#fe2c55",
  "#18181b",
  "#e5e7eb",
  "#38bdf8",
];

const publishMenuItems = [
  { label: "发布视频", icon: Video },
  { label: "发布图文", icon: Image },
  { label: "发布全景视频", icon: Panorama },
  { label: "发布文章", icon: Article },
] as const;

const SCROLL_EPSILON = 1;
const SCROLLABLE_OVERFLOW_PATTERN = /^(auto|scroll|overlay)$/;

const canElementScrollVertically = (element: HTMLElement) => {
  if (element.dataset.sidebarScrollable !== "true") {
    const overflowY = window.getComputedStyle(element).overflowY;

    if (!SCROLLABLE_OVERFLOW_PATTERN.test(overflowY)) {
      return false;
    }
  }

  return element.scrollHeight - element.clientHeight > SCROLL_EPSILON;
};

const getScrollableAncestor = (
  target: EventTarget | null,
  boundary: HTMLElement,
) => {
  let element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  while (element && boundary.contains(element)) {
    if (element instanceof HTMLElement && canElementScrollVertically(element)) {
      return element;
    }

    if (element === boundary) {
      break;
    }

    element = element.parentElement;
  }

  return null;
};

const canScrollInDirection = (element: HTMLElement, deltaY: number) => {
  if (Math.abs(deltaY) <= SCROLL_EPSILON) {
    return true;
  }

  if (deltaY < 0) {
    return element.scrollTop > SCROLL_EPSILON;
  }

  return (
    element.scrollTop + element.clientHeight <
    element.scrollHeight - SCROLL_EPSILON
  );
};

const shouldBlockBoundaryScroll = (
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
) => {
  if (Math.abs(deltaY) <= SCROLL_EPSILON) {
    return false;
  }

  const scrollable = getScrollableAncestor(target, boundary);

  return !scrollable || !canScrollInDirection(scrollable, deltaY);
};

const useScrollBoundaryGuard = (
  boundaryElement: HTMLElement | null,
  active = true,
) => {
  const lastTouchYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!boundaryElement || !active) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      if (shouldBlockBoundaryScroll(event.target, boundaryElement, event.deltaY)) {
        event.preventDefault();
      }

      event.stopPropagation();
    };
    const handleTouchStart = (event: TouchEvent) => {
      lastTouchYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;

      if (typeof currentY !== "number") {
        return;
      }

      const previousY = lastTouchYRef.current ?? currentY;
      const deltaY = previousY - currentY;
      lastTouchYRef.current = currentY;

      if (shouldBlockBoundaryScroll(event.target, boundaryElement, deltaY)) {
        event.preventDefault();
      }

      event.stopPropagation();
    };
    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    boundaryElement.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    boundaryElement.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: false,
    });
    boundaryElement.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    boundaryElement.addEventListener("touchend", handleTouchEnd, {
      capture: true,
    });
    boundaryElement.addEventListener("touchcancel", handleTouchEnd, {
      capture: true,
    });

    return () => {
      boundaryElement.removeEventListener("wheel", handleWheel, {
        capture: true,
      });
      boundaryElement.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      });
      boundaryElement.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
      boundaryElement.removeEventListener("touchend", handleTouchEnd, {
        capture: true,
      });
      boundaryElement.removeEventListener("touchcancel", handleTouchEnd, {
        capture: true,
      });
    };
  }, [active, boundaryElement]);
};

export const CreatorSidebar = ({
  activeRouteId,
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
}: {
  activeRouteId: CreatorRouteId;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  diagnosis: DiagnosisResponse;
  isLoadingDiagnosis: boolean;
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [desktopScrollBoundaryElement, setDesktopScrollBoundaryElement] =
    useState<HTMLElement | null>(null);
  const [mobileScrollBoundaryElement, setMobileScrollBoundaryElement] =
    useState<HTMLElement | null>(null);

  const closeMobileSidebar = () => setIsMobileOpen(false);

  useScrollBoundaryGuard(desktopScrollBoundaryElement);
  useScrollBoundaryGuard(mobileScrollBoundaryElement, isMobileOpen);

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
        ref={setDesktopScrollBoundaryElement}
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
          activeRouteId={activeRouteId}
          collapsed={isDesktopCollapsed}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={onSelectCreator}
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
          ref={setMobileScrollBoundaryElement}
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
            activeRouteId={activeRouteId}
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
  activeRouteId,
  className,
  collapsed = false,
  showBrand = true,
  selectedCreatorId,
  onSelectCreator,
  diagnosis,
  isLoadingDiagnosis,
  onNavigate,
}: {
  activeRouteId: CreatorRouteId;
  className?: string;
  collapsed?: boolean;
  showBrand?: boolean;
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
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
        "flex h-full min-h-0 w-full flex-col overflow-visible py-4",
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

      <div
        className={cn(
          "sidebar-nav-scroll-viewport scroll-isolated mt-7 min-h-0 flex-1 overflow-y-auto",
          collapsed ? "pr-0" : "pr-1",
        )}
        data-sidebar-scrollable="true"
        data-testid="sidebar-nav-scroll-viewport"
      >
        <CreatorSidebarNav
          activeRouteId={activeRouteId}
          collapsed={collapsed}
          selectedCreatorId={selectedCreatorId}
          onNavigate={onNavigate}
        />
      </div>

      {!collapsed ? (
        <div className="mt-4">
          <CreatorAccountNotchSelect
            selectedCreatorId={selectedCreatorId}
            onSelectCreator={onSelectCreator}
          />
        </div>
      ) : null}

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
      "type-body-sm-tight relative z-20 flex items-center gap-2 py-1 text-neutral-950",
      collapsed ? "justify-center px-0" : "px-4",
      className,
    )}
  >
    <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-black text-white">
      <DouyinLogoMark />
    </div>
    <div className={cn("min-w-0", collapsed && "hidden")}>
      <p className="type-control-sm truncate text-neutral-950">
        Creator AI
      </p>
      <p className="type-caption-xs truncate text-neutral-500">
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
}) => {
  const menuId = "sidebar-publish-menu";

  return (
    <div
      className={cn(
        "group/publish-menu relative z-40",
        collapsed ? "w-full" : "ml-2 mr-3 w-[calc(100%-20px)]",
        className,
      )}
      data-testid="sidebar-publish-shell"
    >
      <button
        type="button"
        className={cn(
          "phosphor-hover-root group/publish flex h-10 w-full items-center justify-center rounded-lg bg-[#fe2c55] text-white shadow-[0_12px_24px_rgba(254,44,85,0.18)] transition hover:bg-[#f12850] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]",
          collapsed ? "px-0" : "gap-2 px-3",
        )}
        aria-controls={collapsed ? undefined : menuId}
        aria-label="高清发布"
        aria-haspopup={collapsed ? undefined : "menu"}
        title={collapsed ? "高清发布" : undefined}
        data-testid="sidebar-publish-button"
        onClick={onClick}
      >
        <PhosphorHoverIcon className="h-5 w-5 shrink-0" icon={PlusSquare} />
        <span className={cn("type-card-title-base", collapsed && "sr-only")}>
          高清发布
        </span>
        <CaretDown
          aria-hidden="true"
          className={cn(
            "ml-auto h-4 w-4 shrink-0 transition group-hover/publish:translate-y-0.5 group-hover/publish-menu:rotate-180 group-focus-within/publish-menu:rotate-180",
            collapsed && "hidden",
          )}
          data-testid="sidebar-publish-chevron"
          focusable="false"
          weight={phosphorIconWeight}
        />
      </button>

      {!collapsed ? (
        <>
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-full h-2"
            data-testid="sidebar-publish-hover-bridge"
          />
          <div
            id={menuId}
            className="invisible absolute left-2 right-2 top-[calc(100%+8px)] z-50 rounded-xl bg-white py-3 opacity-0 shadow-[0_14px_34px_rgba(24,24,27,0.14)] ring-1 ring-neutral-200/50 transition duration-150 group-hover/publish-menu:visible group-hover/publish-menu:opacity-100 group-focus-within/publish-menu:visible group-focus-within/publish-menu:opacity-100"
            data-testid="sidebar-publish-menu"
            role="menu"
          >
            {publishMenuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="phosphor-hover-root type-card-title-base flex h-12 w-full items-center gap-4 px-6 text-left text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950 focus-visible:bg-neutral-50 focus-visible:text-neutral-950 focus-visible:outline-none"
                role="menuitem"
                onClick={onClick}
              >
                <PhosphorHoverIcon
                  className="h-5 w-5 text-neutral-600"
                  icon={item.icon}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

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
        <p className="type-control-sm truncate text-neutral-800 transition duration-150 group-hover/sidebar:translate-x-1">
          {diagnosis.creator.displayName}
        </p>
        <p className="type-caption-xs truncate text-neutral-500">
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
