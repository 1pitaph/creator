import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { buildDashboardViewModel } from "./model";
import { DashboardPage } from "./DashboardPage";

vi.mock("react-grid-layout", () => ({
  ResponsiveGridLayout: ({
    children,
    onLayoutChange,
  }: {
    children: ReactNode;
    onLayoutChange?: (
      layout: unknown[],
      layouts: Record<string, unknown[]>,
    ) => void;
  }) => (
    <div data-testid="visual-grid">
      <button
        type="button"
        onClick={() =>
          onLayoutChange?.([], {
            lg: [{ i: "summary", x: 1, y: 2, w: 3, h: 4 }],
            md: [],
            sm: [],
            xs: [],
          })
        }
      >
        mock layout change
      </button>
      {children}
    </div>
  ),
  useContainerWidth: () => ({
    containerRef: { current: null },
    mounted: true,
    width: 1200,
  }),
}));

const renderDashboard = () => {
  const diagnosis = localDiagnosis(defaultCreatorId);
  const viewModel = buildDashboardViewModel(diagnosis);

  render(
    <DashboardPage
      creatorId={defaultCreatorId}
      diagnosis={diagnosis}
      isLoadingDiagnosis={false}
      onAskAgent={vi.fn()}
      viewModel={viewModel}
    />,
  );
};

const readStoredPreferences = () => {
  const raw = window.localStorage.getItem(
    `creator-dashboard-preferences:${defaultCreatorId}:v1`,
  );
  return raw
    ? (JSON.parse(raw) as {
        visual: { layouts: { lg: Array<{ i: string; x: number }> } };
      })
    : null;
};

const installLocalStorageMock = () => {
  const store = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return new Response(
            JSON.stringify({ preferences: JSON.parse(String(init.body)) }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify({ preferences: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Visual, Board, and Table views", () => {
    renderDashboard();

    expect(screen.getByTestId("visual-grid")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.getByText("今天")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("AI 诊断摘要")).toBeInTheDocument();
  });

  it("hides a card from Table and removes it from Visual", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    fireEvent.click(screen.getByLabelText("隐藏 AI 诊断摘要"));
    fireEvent.click(screen.getByRole("button", { name: "Visual" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "AI 诊断摘要" }),
      ).not.toBeInTheDocument();
    });
  });

  it("saves Visual layout changes while editing", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "mock layout change" }));

    await waitFor(() => {
      expect(readStoredPreferences()?.visual.layouts.lg[0]).toMatchObject({
        i: "summary",
        x: 1,
      });
    });
  });
});
