import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UiMessage } from "../../types";
import { localDiagnosis } from "../creator-diagnosis/api";
import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { AgentDrawerContainer } from "./AgentDrawerContainer";

const mockUseAgentChat = vi.hoisted(() => vi.fn());

vi.mock("./useAgentChat", () => ({
  useAgentChat: mockUseAgentChat,
}));

vi.mock("./AgentDrawer", () => ({
  AgentDrawer: ({ open }: { open: boolean }) => (
    <div data-testid="agent-drawer" data-open={String(open)} />
  ),
}));

vi.mock("./AgentFloatingButton", () => ({
  AgentFloatingButton: ({
    hasUnreadMessage,
    open,
    onOpen,
  }: {
    hasUnreadMessage?: boolean;
    open: boolean;
    onOpen: () => void;
  }) => (
    <button
      type="button"
      data-testid="agent-floating-button"
      data-open={String(open)}
      data-unread={String(Boolean(hasUnreadMessage))}
      onClick={onOpen}
    >
      AI Agent
    </button>
  ),
}));

const diagnosis = localDiagnosis(defaultCreatorId);
const activeModuleIds = diagnosis.modules.map((module) => module.id);
const welcomeMessage: UiMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "欢迎使用 AI Agent。",
  localOnly: true,
};

type MockChatState = {
  askPreset: () => void;
  askTarget: () => void;
  close: () => void;
  currentApproval: null;
  denyApproval: () => void;
  focus: null;
  isChatting: boolean;
  isResumingApproval: boolean;
  messages: UiMessage[];
  open: boolean;
  openAgent: () => void;
  approveApproval: () => void;
  stopGeneration: () => void;
  submitQuestion: () => void;
};

const createChatState = (
  overrides: Partial<MockChatState> = {},
): MockChatState => ({
  askPreset: vi.fn(),
  askTarget: vi.fn(),
  close: vi.fn(),
  currentApproval: null,
  denyApproval: vi.fn(),
  focus: null,
  isChatting: false,
  isResumingApproval: false,
  messages: [welcomeMessage],
  open: false,
  openAgent: vi.fn(),
  approveApproval: vi.fn(),
  stopGeneration: vi.fn(),
  submitQuestion: vi.fn(),
  ...overrides,
});

const renderContainer = () =>
  render(
    <AgentDrawerContainer
      activeModuleIds={activeModuleIds}
      command={null}
      creatorId={defaultCreatorId}
      diagnosis={diagnosis}
    />,
  );

describe("AgentDrawerContainer unread indicator", () => {
  let chatState: MockChatState;

  beforeEach(() => {
    chatState = createChatState();
    mockUseAgentChat.mockImplementation(() => chatState);
  });

  it("marks assistant changes as unread only while the drawer is closed", async () => {
    const view = renderContainer();

    expect(screen.getByTestId("agent-floating-button")).toHaveAttribute(
      "data-unread",
      "false",
    );

    chatState = createChatState({
      messages: [
        welcomeMessage,
        {
          id: "assistant-reply",
          role: "assistant",
          content: "这里是新的分析结果。",
        },
      ],
    });
    view.rerender(
      <AgentDrawerContainer
        activeModuleIds={activeModuleIds}
        command={null}
        creatorId={defaultCreatorId}
        diagnosis={diagnosis}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("agent-floating-button")).toHaveAttribute(
        "data-unread",
        "true",
      ),
    );

    chatState = createChatState({
      messages: chatState.messages,
      open: true,
    });
    view.rerender(
      <AgentDrawerContainer
        activeModuleIds={activeModuleIds}
        command={null}
        creatorId={defaultCreatorId}
        diagnosis={diagnosis}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("agent-floating-button")).toHaveAttribute(
        "data-unread",
        "false",
      ),
    );

    chatState = createChatState({
      messages: [
        welcomeMessage,
        {
          id: "assistant-reply",
          role: "assistant",
          content: "这里是打开期间更新的分析结果。",
        },
      ],
      open: true,
    });
    view.rerender(
      <AgentDrawerContainer
        activeModuleIds={activeModuleIds}
        command={null}
        creatorId={defaultCreatorId}
        diagnosis={diagnosis}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("agent-floating-button")).toHaveAttribute(
        "data-unread",
        "false",
      ),
    );
  });
});
