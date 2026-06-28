import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appMocks = vi.hoisted(() => ({
  diagnosisState: {
    diagnosis: {},
    isLoadingDiagnosis: false,
    selectedCreatorId: "creator-1",
    setSelectedCreatorId: vi.fn(),
  },
}));

vi.mock("./features/creator-diagnosis/useCreatorDiagnosis", () => ({
  useCreatorDiagnosis: () => appMocks.diagnosisState,
}));

vi.mock("./features/dashboard/model", () => ({
  buildDashboardViewModel: () => ({ activeModuleIds: [] }),
}));

vi.mock("./features/sidebar/CreatorSidebar", () => ({
  CreatorSidebar: () => <aside data-testid="creator-sidebar" />,
}));

vi.mock("./features/dashboard/DashboardPage", () => ({
  DashboardPage: () => <section data-testid="dashboard-page" />,
}));

vi.mock("./features/agent/AgentDrawerContainer", () => ({
  AgentDrawerContainer: () => <div data-testid="agent-drawer" />,
}));

vi.mock("./features/loading/InitialLoadingOverlay", () => ({
  InitialLoadingOverlay: ({
    active,
    onExitComplete,
  }: {
    active: boolean;
    onExitComplete?: () => void;
  }) => (
    <div data-active={active ? "true" : "false"} data-testid="initial-loading-overlay">
      <button type="button" onClick={onExitComplete}>
        finish loader
      </button>
    </div>
  ),
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    appMocks.diagnosisState.diagnosis = {};
    appMocks.diagnosisState.isLoadingDiagnosis = false;
    appMocks.diagnosisState.selectedCreatorId = "creator-1";
    appMocks.diagnosisState.setSelectedCreatorId.mockClear();
  });

  it("shows the initial loader once and does not repeat it on later loading cycles", async () => {
    appMocks.diagnosisState.isLoadingDiagnosis = true;
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("initial-loading-overlay")).toHaveAttribute(
        "data-active",
        "true",
      );
    });

    appMocks.diagnosisState.isLoadingDiagnosis = false;
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("initial-loading-overlay")).toHaveAttribute(
        "data-active",
        "false",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "finish loader" }));
    expect(screen.queryByTestId("initial-loading-overlay")).not.toBeInTheDocument();

    appMocks.diagnosisState.isLoadingDiagnosis = true;
    rerender(<App />);

    expect(screen.queryByTestId("initial-loading-overlay")).not.toBeInTheDocument();
  });
});
