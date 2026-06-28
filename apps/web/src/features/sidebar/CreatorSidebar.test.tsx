import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { creatorOptions, defaultCreatorId } from "../creator-diagnosis/creatorOptions";
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
        onOpenAgent={vi.fn()}
      />
    );

    const trigger = screen.getByTestId("mobile-sidebar-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByLabelText("关闭侧边栏"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the agent from sidebar navigation", () => {
    const onOpenAgent = vi.fn();

    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
        onOpenAgent={onOpenAgent}
      />
    );

    fireEvent.click(within(screen.getByTestId("creator-sidebar-desktop")).getByRole("button", { name: "AI Agent" }));

    expect(onOpenAgent).toHaveBeenCalledTimes(1);
  });

  it("collapses and expands the desktop sidebar", () => {
    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
        onOpenAgent={vi.fn()}
      />
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    expect(sidebar).toHaveAttribute("data-collapsed", "false");

    fireEvent.click(within(sidebar).getByRole("button", { name: "收起侧边栏" }));
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(within(sidebar).getByRole("button", { name: "展开侧边栏" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(within(sidebar).getByRole("button", { name: "展开侧边栏" }));
    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    expect(within(sidebar).getByRole("button", { name: "收起侧边栏" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps sidebar navigation accessible when collapsed", () => {
    const onOpenAgent = vi.fn();

    render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={localDiagnosis(defaultCreatorId)}
        isLoadingDiagnosis={false}
        onOpenAgent={onOpenAgent}
      />
    );

    const sidebar = screen.getByTestId("creator-sidebar-desktop");
    fireEvent.click(within(sidebar).getByRole("button", { name: "收起侧边栏" }));
    fireEvent.click(within(sidebar).getByRole("button", { name: "AI Agent" }));

    expect(onOpenAgent).toHaveBeenCalledTimes(1);
  });

  it("renders the footer avatar with a stable boring avatar seed", () => {
    const firstDiagnosis = localDiagnosis(defaultCreatorId);
    const secondCreatorId = creatorOptions.find((creator) => creator.id !== defaultCreatorId)?.id ?? defaultCreatorId;
    const secondDiagnosis = localDiagnosis(secondCreatorId);
    const { rerender } = render(
      <CreatorSidebar
        selectedCreatorId={defaultCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={firstDiagnosis}
        isLoadingDiagnosis={false}
        onOpenAgent={vi.fn()}
      />
    );

    const desktopSidebar = screen.getByTestId("creator-sidebar-desktop");
    const avatarShell = within(desktopSidebar).getByTestId("sidebar-footer-avatar");
    const avatarSvg = within(desktopSidebar).getByTestId("sidebar-footer-avatar-svg");

    expect(avatarShell.textContent).toBe("");
    expect(avatarShell).toHaveAttribute("aria-hidden", "true");
    expect(avatarSvg.tagName.toLowerCase()).toBe("svg");
    expect(avatarSvg).toHaveAttribute("data-avatar-seed", firstDiagnosis.creator.id);
    expect(avatarSvg).toHaveAttribute("width", "32");
    expect(avatarSvg).toHaveAttribute("height", "32");
    expect(avatarSvg).toHaveAttribute("focusable", "false");

    rerender(
      <CreatorSidebar
        selectedCreatorId={secondCreatorId}
        onSelectCreator={vi.fn()}
        diagnosis={secondDiagnosis}
        isLoadingDiagnosis={false}
        onOpenAgent={vi.fn()}
      />
    );

    expect(within(screen.getByTestId("creator-sidebar-desktop")).getByTestId("sidebar-footer-avatar-svg")).toHaveAttribute(
      "data-avatar-seed",
      secondDiagnosis.creator.id
    );
  });
});
