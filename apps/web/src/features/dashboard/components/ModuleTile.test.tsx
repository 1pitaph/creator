import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { localDiagnosis } from "../../creator-diagnosis/api";
import { defaultCreatorId } from "../../creator-diagnosis/creatorOptions";
import { ModuleTile } from "./ModuleTile";

vi.mock("@creator/charts", () => ({
  ChartSlot: () => <div data-testid="module-chart-slot" />
}));

describe("ModuleTile", () => {
  it("renders module metadata without embedding the module chart", () => {
    const module = localDiagnosis(defaultCreatorId, "focused").modules.find((item) => item.chart);
    const onAsk = vi.fn();

    expect(module).toBeDefined();

    render(<ModuleTile module={module!} onAsk={onAsk} />);

    expect(screen.getByText(module!.name)).toBeInTheDocument();
    expect(screen.getByText(module!.description)).toBeInTheDocument();
    expect(screen.queryByTestId("module-chart-slot")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(`询问 AI Agent：${module!.name}`));

    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ moduleId: module!.id, title: module!.name }));
  });
});
