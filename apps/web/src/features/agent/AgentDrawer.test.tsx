import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { localDiagnosis } from "../creator-diagnosis/api";
import { AgentDrawer } from "./AgentDrawer";

const diagnosis = localDiagnosis(defaultCreatorId);
const moduleById = new Map(diagnosis.modules.map((module) => [module.id, module]));

describe("AgentDrawer", () => {
  it("renders used module badges and disables empty submit", () => {
    render(
      <AgentDrawer
        open
        onClose={vi.fn()}
        messages={[
          {
            id: "assistant",
            role: "assistant",
            content: "回答内容",
            usedModules: [diagnosis.modules[0]!.id],
            mode: "mock"
          }
        ]}
        draft=""
        isChatting={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onAskPreset={vi.fn()}
        onApproveApproval={vi.fn()}
        onDenyApproval={vi.fn()}
        isResumingApproval={false}
        moduleById={moduleById}
        endRef={{ current: null }}
        focus={null}
      />
    );

    expect(screen.getByText(diagnosis.modules[0]!.name)).toBeInTheDocument();
    expect(screen.getByLabelText("发送消息")).toBeDisabled();
  });

  it("passes preset questions back to the container", () => {
    const onAskPreset = vi.fn();

    render(
      <AgentDrawer
        open
        onClose={vi.fn()}
        messages={[]}
        draft="已有问题"
        isChatting={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onAskPreset={onAskPreset}
        onApproveApproval={vi.fn()}
        onDenyApproval={vi.fn()}
        isResumingApproval={false}
        moduleById={moduleById}
        endRef={{ current: null }}
        focus={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /下一条视频拍什么/ }));

    expect(onAskPreset).toHaveBeenCalledWith("下一条视频拍什么？");
  });

  it("renders approval controls", () => {
    const onApproveApproval = vi.fn();
    const onDenyApproval = vi.fn();

    render(
      <AgentDrawer
        open
        onClose={vi.fn()}
        messages={[]}
        draft=""
        isChatting={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onAskPreset={vi.fn()}
        approval={{
          id: "approval-1",
          threadId: "thread-1",
          actionIds: ["action-1"],
          title: "确认写入行动计划",
          detail: "将 1 条建议写入当前创作者的行动计划。",
          createdAt: "2026-06-28T00:00:00.000Z"
        }}
        onApproveApproval={onApproveApproval}
        onDenyApproval={onDenyApproval}
        isResumingApproval={false}
        moduleById={moduleById}
        endRef={{ current: null }}
        focus={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    fireEvent.click(screen.getByRole("button", { name: "拒绝" }));

    expect(onApproveApproval).toHaveBeenCalledTimes(1);
    expect(onDenyApproval).toHaveBeenCalledTimes(1);
  });
});
