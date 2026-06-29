import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  creatorOptions,
  defaultCreatorId,
} from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { CreatorSidebar } from "./CreatorSidebar";

const creatorTypeShortLabels = {
  short_drama_strategy: "短剧",
  personal_daily_diagnosis: "日常",
  growth_review: "职场",
  plateau_repair: "健身",
  series_operation: "城市",
} as const;

const getCreatorTypeShortLabel = (creator: (typeof creatorOptions)[number]) =>
  creatorTypeShortLabels[
    creator.creatorType as keyof typeof creatorTypeShortLabels
  ] ?? creator.domain.split(/[/／]/)[0]?.slice(0, 2) ?? "账号";

const stylesCss = readFileSync("src/styles.css", "utf8");
let stylesElement: HTMLStyleElement;

beforeAll(() => {
  stylesElement = document.createElement("style");
  stylesElement.textContent = stylesCss;
  document.head.append(stylesElement);
});

afterAll(() => {
  stylesElement.remove();
});

const renderSidebar = ({
  onSelectCreator = vi.fn(),
  onSelectPanel = vi.fn(),
  selectedPanel = "overview" as const,
} = {}) =>
  render(
    <CreatorSidebar
      selectedCreatorId={defaultCreatorId}
      onSelectCreator={onSelectCreator}
      selectedPanel={selectedPanel}
      onSelectPanel={onSelectPanel}
      diagnosis={localDiagnosis(defaultCreatorId)}
      isLoadingDiagnosis={false}
    />,
  );

const expectPhosphorHoverIcon = (root: HTMLElement) => {
  expect(root).toHaveClass("phosphor-hover-root");
  expect(root.querySelector(".phosphor-hover-icon__regular")).toBeInTheDocument();
  expect(root.querySelector(".phosphor-hover-icon__duotone")).toBeInTheDocument();
};

const defineScrollableMetrics = ({
  clientHeight,
  element,
  scrollHeight,
  scrollTop,
}: {
  clientHeight: number;
  element: HTMLElement;
  scrollHeight: number;
  scrollTop: number;
}) => {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  element.scrollTop = scrollTop;
};

const dispatchWheel = (target: HTMLElement, deltaY = 80) => {
  const wheelEvent = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY,
  });

  target.dispatchEvent(wheelEvent);

  return wheelEvent;
};

describe("CreatorSidebar", () => {
  it("opens and closes the mobile sidebar", () => {
    renderSidebar();

    const trigger = screen.getByTestId("mobile-sidebar-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByLabelText("关闭侧边栏"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses and expands the desktop sidebar", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    expect(sidebar).toHaveAttribute("data-collapsed", "false");

    fireEvent.click(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    );
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(
      within(sidebar).getByRole("button", { name: "展开侧边栏" }),
    ).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(
      within(sidebar).getByRole("button", { name: "展开侧边栏" }),
    );
    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    expect(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the desktop boundary strip without the old right shadow", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const boundaryStrip = within(sidebar).getByTestId("sidebar-boundary-strip");

    expect(sidebar.className).not.toContain(
      "shadow-[6px_0_18px_rgba(15,23,42,0.04)]",
    );
    expect(sidebar).not.toHaveClass("border-r");
    expect(boundaryStrip).toHaveAttribute("aria-hidden", "true");
    expect(boundaryStrip).toHaveClass(
      "pointer-events-none",
      "absolute",
      "inset-y-0",
      "right-0",
      "w-4",
      "border-l",
      "border-r",
    );
    expect(boundaryStrip.className).toContain("repeating-linear-gradient");
    expect(boundaryStrip.className).toContain("transparent_5px");
  });

  it("keeps sidebar navigation accessible when collapsed", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    );

    expect(within(sidebar).getByTestId("sidebar-content")).toHaveClass(
      "px-2",
    );
    expect(within(sidebar).getByTestId("sidebar-boundary-strip")).toHaveClass(
      "-right-4",
    );
    expect(
      within(sidebar).getByRole("button", { name: "首页" }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("button", { name: "内容管理" }),
    ).toBeInTheDocument();
  });

  it("isolates sidebar navigation scrolling from the main page", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const content = within(sidebar).getByTestId("sidebar-content");
    const viewport = within(sidebar).getByTestId("sidebar-nav-scroll-viewport");

    expect(content).toHaveClass("min-h-0");
    expect(viewport.tagName.toLowerCase()).toBe("div");
    expect(viewport).toHaveAttribute("data-sidebar-scrollable", "true");
    expect(viewport).toHaveClass(
      "sidebar-nav-scroll-viewport",
      "scroll-isolated",
      "overflow-y-auto",
      "min-h-0",
      "flex-1",
    );
    expect(getComputedStyle(viewport).overflowY).toBe("auto");
    expect(getComputedStyle(viewport).overscrollBehaviorY).toBe("contain");
    expect(getComputedStyle(viewport).scrollbarWidth).toBe("none");
  });

  it("prevents sidebar wheel gestures outside the nav viewport from scrolling the page", async () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const content = within(sidebar).getByTestId("sidebar-content");

    await waitFor(() => {
      const wheelEvent = dispatchWheel(content);

      expect(wheelEvent.defaultPrevented).toBe(true);
    });
  });

  it("keeps wheel scrolling available inside the sidebar nav viewport", async () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const viewport = within(sidebar).getByTestId("sidebar-nav-scroll-viewport");

    defineScrollableMetrics({
      clientHeight: 100,
      element: viewport,
      scrollHeight: 320,
      scrollTop: 80,
    });

    await waitFor(() => {
      const wheelEvent = dispatchWheel(viewport);

      expect(wheelEvent.defaultPrevented).toBe(false);
    });
  });

  it("blocks sidebar nav wheel gestures at scroll boundaries", async () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const viewport = within(sidebar).getByTestId("sidebar-nav-scroll-viewport");

    defineScrollableMetrics({
      clientHeight: 100,
      element: viewport,
      scrollHeight: 320,
      scrollTop: 0,
    });

    await waitFor(() => {
      const wheelEvent = dispatchWheel(viewport, -80);

      expect(wheelEvent.defaultPrevented).toBe(true);
    });

    viewport.scrollTop = 220;

    await waitFor(() => {
      const wheelEvent = dispatchWheel(viewport, 80);

      expect(wheelEvent.defaultPrevented).toBe(true);
    });
  });

  it("uses the same hidden-scrollbar scroll boundary in the mobile sidebar", async () => {
    renderSidebar();

    fireEvent.click(screen.getByTestId("mobile-sidebar-trigger"));

    const mobileSidebar = screen.getByTestId("creator-sidebar-mobile");
    const content = within(mobileSidebar).getByTestId("sidebar-content");
    const viewport = within(mobileSidebar).getByTestId(
      "sidebar-nav-scroll-viewport",
    );

    expect(viewport).toHaveClass(
      "sidebar-nav-scroll-viewport",
      "scroll-isolated",
      "overflow-y-auto",
    );

    await waitFor(() => {
      const wheelEvent = dispatchWheel(content);

      expect(wheelEvent.defaultPrevented).toBe(true);
    });

    defineScrollableMetrics({
      clientHeight: 100,
      element: viewport,
      scrollHeight: 320,
      scrollTop: 80,
    });

    await waitFor(() => {
      const wheelEvent = dispatchWheel(viewport);

      expect(wheelEvent.defaultPrevented).toBe(false);
    });
  });

  it("renders the Douyin-style sidebar modules and publish CTA", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const homeButton = within(sidebar).getByRole("button", { name: "首页" });
    const publishButton = within(sidebar).getByRole("button", {
      name: "高清发布",
    });
    const publishBridge = within(sidebar).getByTestId(
      "sidebar-publish-hover-bridge",
    );
    const publishMenu = within(sidebar).getByTestId("sidebar-publish-menu");

    expect(publishButton).toBeInTheDocument();
    expect(publishButton).toHaveAttribute(
      "aria-controls",
      "sidebar-publish-menu",
    );
    expect(publishButton).toHaveAttribute("aria-haspopup", "menu");
    expect(
      publishButton.querySelectorAll("[data-phosphor-hover-icon]"),
    ).toHaveLength(1);
    expect(
      within(publishButton).getByTestId("sidebar-publish-chevron"),
    ).not.toHaveAttribute("data-phosphor-hover-icon");
    expect(publishBridge).toHaveClass(
      "absolute",
      "top-full",
      "h-2",
    );
    expect(publishBridge).toHaveAttribute("aria-hidden", "true");
    expect(publishMenu).toHaveClass(
      "invisible",
      "absolute",
      "group-hover/publish-menu:visible",
      "group-focus-within/publish-menu:visible",
    );
    for (const label of ["发布视频", "发布图文", "发布全景视频", "发布文章"]) {
      const menuItem = within(publishMenu).getByRole("menuitem", {
        name: label,
      });

      expect(menuItem).toBeInTheDocument();
      expectPhosphorHoverIcon(menuItem);
    }
    expect(homeButton).toHaveAttribute("aria-current", "page");
    expectPhosphorHoverIcon(homeButton);
    expect(within(sidebar).queryByText("诊断总览")).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("行动队列")).not.toBeInTheDocument();

    for (const label of [
      "活动管理",
      "内容管理",
      "互动管理",
      "数据中心",
      "变现中心",
      "创作中心",
    ]) {
      expect(within(sidebar).getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("routes activity and account overview entries through sidebar navigation", () => {
    const handleSelectPanel = vi.fn();
    renderSidebar({ onSelectPanel: handleSelectPanel });

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(within(sidebar).getByRole("button", { name: "活动管理" }));
    fireEvent.click(within(sidebar).getByRole("button", { name: "数据中心" }));
    fireEvent.click(within(sidebar).getByRole("button", { name: "账号总览" }));

    expect(handleSelectPanel).toHaveBeenCalledWith("board");
    expect(handleSelectPanel).toHaveBeenCalledWith("table");
  });

  it("expands sidebar groups and renders official child items", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    expect(
      within(sidebar).getByRole("button", { name: "变现中心" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(sidebar).getByRole("button", { name: "内容管理" }),
    ).toHaveAttribute("aria-expanded", "false");

    for (const group of ["内容管理", "互动管理", "数据中心", "创作中心"]) {
      fireEvent.click(within(sidebar).getByRole("button", { name: group }));
      expect(
        within(sidebar).getByRole("button", { name: group }),
      ).toHaveAttribute("aria-expanded", "true");
    }

    for (const child of [
      "作品管理",
      "合集管理",
      "共创中心",
      "原创保护中心",
      "关注管理",
      "粉丝管理",
      "评论管理",
      "弹幕管理",
      "私信管理",
      "账号总览",
      "作品分析",
      "粉丝分析",
      "重点关心",
      "变现广场",
      "我的任务",
      "我的收入",
      "创作灵感",
      "学习中心",
      "抖音指数",
    ]) {
      expect(within(sidebar).getByRole("button", { name: child })).toBeInTheDocument();
    }

    fireEvent.click(within(sidebar).getByRole("button", { name: "内容管理" }));
    expect(
      within(sidebar).getByRole("button", { name: "内容管理" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps mobile sidebar open for group toggles and closes on navigation", () => {
    const handleSelectPanel = vi.fn();
    renderSidebar({ onSelectPanel: handleSelectPanel });

    const mobileTrigger = screen.getByTestId("mobile-sidebar-trigger");
    fireEvent.click(mobileTrigger);
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "true");

    const mobileSidebar = screen.getByTestId("creator-sidebar-mobile");
    fireEvent.click(within(mobileSidebar).getByRole("button", { name: "内容管理" }));
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(mobileSidebar).getByRole("button", { name: "作品管理" }));
    expect(handleSelectPanel).not.toHaveBeenCalled();
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the creator account notch above the footer", () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const navigation = within(sidebar).getByRole("navigation");
    const accountNotch = within(sidebar).getByTestId("creator-account-notch");
    const footer = within(sidebar).getByTestId("sidebar-footer");
    const notchShell = within(accountNotch).getByTestId("notch-shell");

    expect(
      navigation.compareDocumentPosition(accountNotch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      accountNotch.compareDocumentPosition(footer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(notchShell).toHaveClass("bg-neutral-950/95");
    const sampleLabel = within(accountNotch).getByText("示例数据");

    expect(sampleLabel).toHaveClass("type-table-head", "text-neutral-100");
    expect(within(accountNotch).queryByText("示例")).not.toBeInTheDocument();
    expect(within(accountNotch).queryByText("数据")).not.toBeInTheDocument();
    expect(within(accountNotch).getByText("账号")).toBeInTheDocument();
    expect(within(accountNotch).getByText("短剧")).toBeInTheDocument();
    expect(
      within(accountNotch).queryByText(creatorOptions[0]!.name),
    ).not.toBeInTheDocument();
    expect(within(accountNotch).getByTestId("notch-divider")).toBeInTheDocument();
    expect(
      within(accountNotch).getByTestId("notch-static-sample"),
    ).toBeInTheDocument();
    expect(
      within(accountNotch).queryByTestId("notch-trigger-sample"),
    ).not.toBeInTheDocument();
    expect(
      within(accountNotch).queryByTestId("notch-trigger-status"),
    ).not.toBeInTheDocument();
  });

  it("opens the desktop creator notch and selects another creator", async () => {
    const handleSelectCreator = vi.fn();
    const firstCreator = creatorOptions[0]!;
    const secondCreator =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId) ??
      firstCreator;
    const firstCreatorShortLabel = getCreatorTypeShortLabel(firstCreator);
    const secondCreatorShortLabel = getCreatorTypeShortLabel(secondCreator);

    renderSidebar({ onSelectCreator: handleSelectCreator });

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const trigger = within(sidebar).getByTestId("notch-trigger-account");

    fireEvent.click(trigger);

    const listbox = await screen.findByRole("listbox", { name: "账号" });
    expect(
      within(listbox).getByRole("option", { name: firstCreatorShortLabel }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(listbox).queryByText(firstCreator.name)).not.toBeInTheDocument();
    expect(within(listbox).queryByText(secondCreator.name)).not.toBeInTheDocument();
    fireEvent.click(
      within(listbox).getByRole("option", {
        name: secondCreatorShortLabel,
      }),
    );

    expect(handleSelectCreator).toHaveBeenCalledWith(secondCreator.id);
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "账号" })).not.toBeInTheDocument(),
    );
    expect(within(sidebar).getByTestId("notch-trigger-row")).toBeInTheDocument();
  });

  it("keeps the sample segment static while the account segment opens", async () => {
    const handleSelectCreator = vi.fn();
    renderSidebar({ onSelectCreator: handleSelectCreator });

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const accountNotch = within(sidebar).getByTestId("creator-account-notch");
    fireEvent.click(within(accountNotch).getByTestId("notch-static-sample"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(within(accountNotch).getByTestId("notch-trigger-account"));

    expect(await screen.findByRole("listbox", { name: "账号" })).toBeInTheDocument();
    expect(handleSelectCreator).not.toHaveBeenCalled();
  });

  it("closes the mobile sidebar after selecting from the bottom notch", async () => {
    const handleSelectCreator = vi.fn();
    const secondCreator =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId) ??
      creatorOptions[0]!;
    const secondCreatorShortLabel = getCreatorTypeShortLabel(secondCreator);

    renderSidebar({ onSelectCreator: handleSelectCreator });

    const mobileTrigger = screen.getByTestId("mobile-sidebar-trigger");
    fireEvent.click(mobileTrigger);
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "true");

    const mobileSidebar = screen.getByTestId("creator-sidebar-mobile");
    const accountTrigger = within(mobileSidebar).getByTestId("notch-trigger-account");

    fireEvent.click(accountTrigger);
    const listbox = await screen.findByRole("listbox", { name: "账号" });
    fireEvent.click(
      within(listbox).getByRole("option", {
        name: secondCreatorShortLabel,
      }),
    );

    expect(handleSelectCreator).toHaveBeenCalledWith(secondCreator.id);
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a compact creator switcher accessible when collapsed", async () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    );

    const compactTrigger = within(sidebar).getByRole("button", {
      name: `切换创作者账号：${creatorOptions[0]!.name}`,
    });
    fireEvent.click(compactTrigger);

    expect(await screen.findByRole("listbox", { name: "账号" })).toBeInTheDocument();
  });

  it("closes the creator notch on Escape and outside click", async () => {
    renderSidebar();

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const trigger = within(sidebar).getByTestId("notch-trigger-account");

    fireEvent.click(trigger);

    expect(await screen.findByRole("listbox", { name: "账号" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "账号" })).not.toBeInTheDocument(),
    );
    expect(within(sidebar).getByTestId("notch-trigger-row")).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByTestId("notch-trigger-account"));
    expect(await screen.findByRole("listbox", { name: "账号" })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "账号" })).not.toBeInTheDocument(),
    );
    expect(within(sidebar).getByTestId("notch-trigger-row")).toBeInTheDocument();
  });

  it("renders the footer avatar with a stable boring avatar seed", () => {
    const firstDiagnosis = localDiagnosis(defaultCreatorId);
    const secondCreatorId =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId)?.id ??
      defaultCreatorId;
    const secondDiagnosis = localDiagnosis(secondCreatorId);
    const { rerender } = render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        selectedPanel="overview"
        onSelectPanel={vi.fn()}
        diagnosis={firstDiagnosis}
        isLoadingDiagnosis={false}
      />,
    );

    const desktopSidebar = screen.getByTestId("creator-sidebar-desktop");
    const avatarShell = within(desktopSidebar).getByTestId(
      "sidebar-footer-avatar",
    );
    const avatarSvg = within(desktopSidebar).getByTestId(
      "sidebar-footer-avatar-svg",
    );

    expect(avatarShell.textContent).toBe("");
    expect(avatarShell).toHaveAttribute("aria-hidden", "true");
    expect(avatarSvg.tagName.toLowerCase()).toBe("svg");
    expect(avatarSvg).toHaveAttribute(
      "data-avatar-seed",
      firstDiagnosis.creator.id,
    );
    expect(avatarSvg).toHaveAttribute("width", "32");
    expect(avatarSvg).toHaveAttribute("height", "32");
    expect(avatarSvg).toHaveAttribute("focusable", "false");

    rerender(
      <CreatorSidebar
        selectedCreatorId={secondCreatorId}
        onSelectCreator={vi.fn()}
        selectedPanel="overview"
        onSelectPanel={vi.fn()}
        diagnosis={secondDiagnosis}
        isLoadingDiagnosis={false}
      />,
    );

    expect(
      within(screen.getByTestId("creator-sidebar-desktop")).getByTestId(
        "sidebar-footer-avatar-svg",
      ),
    ).toHaveAttribute("data-avatar-seed", secondDiagnosis.creator.id);
  });
});
