import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appMocks = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const diagnosisState = {
    diagnosis: {},
    isLoadingDiagnosis: false,
    selectedCreatorId: "creator-1",
    setSelectedCreatorId: vi.fn(),
  };

  return {
    diagnosisState,
    listeners,
    setDiagnosisState: (nextState: Partial<typeof diagnosisState>) => {
      Object.assign(diagnosisState, nextState);
      listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("./features/creator-diagnosis/useCreatorDiagnosis", async () => {
  const React = await import("react");

  return {
    useCreatorDiagnosis: () => {
      const [, forceUpdate] = React.useState(0);

      React.useEffect(() => {
        const listener = () => forceUpdate((version) => version + 1);
        appMocks.listeners.add(listener);

        return () => {
          appMocks.listeners.delete(listener);
        };
      }, []);

      return appMocks.diagnosisState;
    },
  };
});

vi.mock("./features/dashboard/model", () => ({
  buildDashboardViewModel: () => ({ activeModuleIds: [] }),
}));

vi.mock("./features/sidebar/CreatorSidebar", () => ({
  CreatorSidebar: ({
    activeRouteId,
    selectedCreatorId,
  }: {
    activeRouteId: string;
    selectedCreatorId: string;
  }) => (
    <aside
      data-active-route-id={activeRouteId}
      data-creator-id={selectedCreatorId}
      data-testid="creator-sidebar"
    />
  ),
}));

vi.mock("./features/dashboard/DashboardPage", () => ({
  DashboardPage: ({
    creatorId,
    panel,
  }: {
    creatorId: string;
    panel: string;
  }) => (
    <section
      data-creator-id={creatorId}
      data-panel={panel}
      data-testid="dashboard-page"
    />
  ),
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
import { appRoutes } from "./appRoutes";
import { defaultCreatorId } from "./features/creator-diagnosis/creatorOptions";
import { getCreatorRoutePath } from "./features/navigation/creatorRoutes";

describe("App", () => {
  beforeEach(() => {
    appMocks.setDiagnosisState({
      diagnosis: {},
      isLoadingDiagnosis: false,
      selectedCreatorId: "creator-1",
    });
    appMocks.diagnosisState.setSelectedCreatorId.mockClear();
  });

  it("shows the initial loader once and does not repeat it on later loading cycles", async () => {
    appMocks.setDiagnosisState({ isLoadingDiagnosis: true });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("initial-loading-overlay")).toHaveAttribute(
        "data-active",
        "true",
      );
    });

    act(() => {
      appMocks.setDiagnosisState({ isLoadingDiagnosis: false });
    });

    await waitFor(() => {
      expect(screen.getByTestId("initial-loading-overlay")).toHaveAttribute(
        "data-active",
        "false",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "finish loader" }));
    expect(screen.queryByTestId("initial-loading-overlay")).not.toBeInTheDocument();

    act(() => {
      appMocks.setDiagnosisState({ isLoadingDiagnosis: true });
    });

    expect(screen.queryByTestId("initial-loading-overlay")).not.toBeInTheDocument();
  });

  it("maps creator deep links to sidebar active route and dashboard panel", async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: [
        getCreatorRoutePath(defaultCreatorId, "dataAccountOverview"),
      ],
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId("creator-sidebar")).toHaveAttribute(
      "data-active-route-id",
      "dataAccountOverview",
    );
    expect(screen.getByTestId("creator-sidebar")).toHaveAttribute(
      "data-creator-id",
      defaultCreatorId,
    );
    expect(screen.getByTestId("dashboard-page")).toHaveAttribute(
      "data-panel",
      "table",
    );
    expect(screen.getByTestId("dashboard-page")).toHaveAttribute(
      "data-creator-id",
      defaultCreatorId,
    );
  });
});
