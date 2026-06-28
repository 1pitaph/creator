import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MagneticButton } from "@creator/ui";

const installRectMock = (element: HTMLElement) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
};

describe("MagneticButton", () => {
  it("renders children without replacing their semantics", () => {
    render(
      <MagneticButton>
        <button type="button">Magnetic child</button>
      </MagneticButton>,
    );

    expect(
      screen.getByRole("button", { name: "Magnetic child" }),
    ).toBeInTheDocument();
  });

  it("moves toward the pointer", () => {
    render(
      <MagneticButton>
        <button type="button">Magnetic child</button>
      </MagneticButton>,
    );

    const wrapper = screen.getByRole("button", {
      name: "Magnetic child",
    }).parentElement as HTMLElement;
    installRectMock(wrapper);

    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 0 });

    expect(wrapper.style.transform).toBe("translate3d(14.00px, -14.00px, 0px)");
  });

  it("resets after pointer leaves", () => {
    render(
      <MagneticButton>
        <button type="button">Magnetic child</button>
      </MagneticButton>,
    );

    const wrapper = screen.getByRole("button", {
      name: "Magnetic child",
    }).parentElement as HTMLElement;
    installRectMock(wrapper);

    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 0 });
    fireEvent.pointerLeave(wrapper);

    expect(wrapper.style.transform).toBe("translate3d(0.00px, 0.00px, 0px)");
  });

  it("does not move when disabled", () => {
    render(
      <MagneticButton disabled>
        <button type="button">Magnetic child</button>
      </MagneticButton>,
    );

    const wrapper = screen.getByRole("button", {
      name: "Magnetic child",
    }).parentElement as HTMLElement;
    installRectMock(wrapper);

    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 0 });

    expect(wrapper.style.transform).toBe("translate3d(0.00px, 0.00px, 0px)");
  });
});
