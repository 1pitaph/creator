import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  creatorOptions,
  defaultCreatorId,
} from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { CreatorSidebar } from "./CreatorSidebar";

describe("CreatorSidebar", () => {
  it("opens and closes the mobile sidebar", () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const trigger = screen.getByTestId("mobile-sidebar-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByLabelText("关闭侧边栏"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses and expands the desktop sidebar", () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

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

  it("keeps sidebar navigation accessible when collapsed", () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    );

    expect(
      within(sidebar).getByRole("button", { name: "诊断总览" }),
    ).toBeInTheDocument();
  });

  it("renders the creator account notch above the footer", () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const navigation = within(sidebar).getByRole("navigation");
    const accountNotch = within(sidebar).getByTestId("creator-account-notch");
    const footer = within(sidebar).getByTestId("sidebar-footer");

    expect(
      navigation.compareDocumentPosition(accountNotch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      accountNotch.compareDocumentPosition(footer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens the desktop creator notch and selects another creator", async () => {
    const handleSelectCreator = vi.fn();
    const secondCreator =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId) ??
      creatorOptions[0]!;

    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={handleSelectCreator}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const trigger = within(sidebar).getByTestId(
      "creator-account-notch-trigger",
    );

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const listbox = await screen.findByRole("listbox", {
      name: "选择创作者账号",
    });
    fireEvent.click(within(listbox).getByRole("option", {
      name: new RegExp(secondCreator.name),
    }));

    expect(handleSelectCreator).toHaveBeenCalledWith(secondCreator.id);
    await waitFor(() =>
      expect(
        screen.queryByRole("listbox", { name: "选择创作者账号" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes the mobile sidebar after selecting from the bottom notch", async () => {
    const handleSelectCreator = vi.fn();
    const secondCreator =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId) ??
      creatorOptions[0]!;

    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={handleSelectCreator}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const mobileTrigger = screen.getByTestId("mobile-sidebar-trigger");
    fireEvent.click(mobileTrigger);
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "true");

    const mobileSidebar = screen.getByTestId("creator-sidebar-mobile");
    const accountTrigger = within(mobileSidebar).getByTestId(
      "creator-account-notch-trigger",
    );

    fireEvent.click(accountTrigger);
    const listbox = await screen.findByRole("listbox", {
      name: "选择创作者账号",
    });
    fireEvent.click(within(listbox).getByRole("option", {
      name: new RegExp(secondCreator.name),
    }));

    expect(handleSelectCreator).toHaveBeenCalledWith(secondCreator.id);
    expect(mobileTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a compact creator switcher accessible when collapsed", async () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "收起侧边栏" }),
    );

    const compactTrigger = within(sidebar).getByRole("button", {
      name: `切换创作者账号：${creatorOptions[0]!.name}`,
    });
    fireEvent.click(compactTrigger);

    expect(
      await screen.findByRole("listbox", { name: "选择创作者账号" }),
    ).toBeInTheDocument();
  });

  it("supports keyboard navigation and Escape in the creator notch", async () => {
    const handleSelectCreator = vi.fn();
    const secondCreator =
      creatorOptions.find((creator) => creator.id !== defaultCreatorId) ??
      creatorOptions[0]!;

    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={handleSelectCreator}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
      />,
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    const trigger = within(sidebar).getByTestId(
      "creator-account-notch-trigger",
    );

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });

    let listbox = await screen.findByRole("listbox", {
      name: "选择创作者账号",
    });
    fireEvent.keyDown(listbox, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("listbox", { name: "选择创作者账号" }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(trigger, { key: "Enter" });
    listbox = await screen.findByRole("listbox", {
      name: "选择创作者账号",
    });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      expect.stringMatching(/-1$/),
    );
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(handleSelectCreator).toHaveBeenCalledWith(secondCreator.id);
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
