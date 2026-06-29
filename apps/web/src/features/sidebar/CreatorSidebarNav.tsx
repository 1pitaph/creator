import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { type ReactNode, useState } from "react";
import { NavLink } from "react-router";

import { cn } from "@creator/ui";

import { PhosphorHoverIcon } from "../../components/ui/PhosphorHoverIcon";
import {
  getCreatorRoutePath,
  type CreatorRouteId,
} from "../navigation/creatorRoutes";
import { preloadCreatorRoute } from "../navigation/preload";
import { getDefaultSidebarOpenGroups, getSidebarGroupIdForRoute } from "./navModel";
import { sidebarNavItems } from "./navItems";

export const CreatorSidebarNav = ({
  activeRouteId,
  collapsed = false,
  selectedCreatorId,
  onNavigate,
}: {
  activeRouteId: CreatorRouteId;
  collapsed?: boolean;
  selectedCreatorId: string;
  onNavigate?: () => void;
}) => {
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>(
    getDefaultSidebarOpenGroups,
  );
  const activeGroupId = getSidebarGroupIdForRoute(activeRouteId);

  return (
    <nav className="flex flex-col" aria-label="创作者中心导航">
      {sidebarNavItems.map((item) => {
        if (item.kind === "leaf") {
          return (
            <SidebarLinkItem
              key={item.id}
              collapsed={collapsed}
              label={item.label}
              icon={item.icon}
              routeId={item.routeId}
              selectedCreatorId={selectedCreatorId}
              separated={item.separated}
              onNavigate={onNavigate}
            />
          );
        }

        const open = Boolean(openGroupIds[item.id]) || activeGroupId === item.id;
        const active = activeGroupId === item.id;

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
                label={child.label}
                routeId={child.routeId}
                selectedCreatorId={selectedCreatorId}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarGroupItem>
        );
      })}
    </nav>
  );
};

const createPreloadRouteIntent = (routeId: CreatorRouteId) => () => {
  preloadCreatorRoute(routeId);
};

const SidebarLinkItem = ({
  collapsed = false,
  label,
  icon,
  routeId,
  selectedCreatorId,
  separated = false,
  onNavigate,
}: {
  collapsed?: boolean;
  label: string;
  icon: ReactNode;
  routeId: CreatorRouteId;
  selectedCreatorId: string;
  separated?: boolean;
  onNavigate?: () => void;
}) => {
  const preloadRoute = createPreloadRouteIntent(routeId);

  return (
    <NavLink
      end
      className={({ isActive, isPending }) =>
        cn(
          "phosphor-hover-root group/sidebar relative block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
          collapsed
            ? "w-full px-0 text-center"
            : "mx-2 w-[calc(100%-16px)] px-2 text-left",
          separated && "mt-3 border-t border-neutral-200 pt-3",
          isPending && "opacity-80",
          isActive && "text-neutral-950",
        )
      }
      title={collapsed ? label : undefined}
      to={getCreatorRoutePath(selectedCreatorId, routeId)}
      onClick={onNavigate}
      onFocus={preloadRoute}
      onMouseEnter={preloadRoute}
      onPointerEnter={preloadRoute}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "pointer-events-none absolute inset-x-0 z-10 rounded-lg bg-neutral-200 transition-opacity duration-150 ease-out",
              separated ? "top-3.5 bottom-0.5" : "inset-y-0.5",
              isActive
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
                isActive ? "text-neutral-900" : "text-neutral-500",
              )}
            >
              {icon}
            </span>
            <span
              className={cn(
                "type-control-sm inline-block whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
                isActive ? "text-neutral-950" : "text-neutral-500",
                collapsed && "sr-only",
              )}
            >
              {label}
            </span>
          </span>
        </>
      )}
    </NavLink>
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
}) => (
  <div className={cn(separated && "mt-3 border-t border-neutral-200 pt-3")}>
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`sidebar-group-${itemId}`}
      className={cn(
        "phosphor-hover-root group/sidebar relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
        collapsed
          ? "w-full px-0 text-center"
          : "mx-2 w-[calc(100%-16px)] px-2 text-left",
      )}
      title={collapsed ? label : undefined}
      data-testid={`sidebar-nav-group-${itemId}`}
      onClick={onToggle}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 inset-y-0.5 z-10 rounded-lg bg-neutral-200 transition-opacity duration-150 ease-out",
          active
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
            "type-control-sm inline-block whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1 group-focus/sidebar:translate-x-1",
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

const SidebarChildLink = ({
  label,
  routeId,
  selectedCreatorId,
  onNavigate,
}: {
  label: string;
  routeId: CreatorRouteId;
  selectedCreatorId: string;
  onNavigate?: () => void;
}) => {
  const preloadRoute = createPreloadRouteIntent(routeId);

  return (
    <NavLink
      className={({ isActive, isPending }) =>
        cn(
          "type-body-sm-tight mx-2 block h-9 w-[calc(100%-16px)] rounded-lg pl-[52px] pr-3 text-left leading-9 transition hover:bg-neutral-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
          isActive ? "bg-neutral-200 text-neutral-950" : "text-neutral-500",
          isPending && "opacity-80",
        )
      }
      to={getCreatorRoutePath(selectedCreatorId, routeId)}
      onClick={onNavigate}
      onFocus={preloadRoute}
      onMouseEnter={preloadRoute}
      onPointerEnter={preloadRoute}
    >
      {label}
    </NavLink>
  );
};
