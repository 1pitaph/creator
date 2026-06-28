import { createStructuredAgentRun } from "@creator/data-agent";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { localDiagnosis } from "../creator-diagnosis/api";
import { defaultCreatorId } from "../creator-diagnosis/creatorOptions";
import { ChatBubble } from "./ChatBubble";

describe("ChatBubble", () => {
  it("shows tool error status inside the AgentRun audit panel", () => {
    const diagnosis = localDiagnosis(defaultCreatorId);
    const agentRun = createStructuredAgentRun({
      diagnosis,
      messages: [{ role: "user", content: "为什么完播率不好？" }],
      activeModules: ["content-diagnosis"],
    });

    render(
      <ChatBubble
        message={{
          id: "message-1",
          role: "assistant",
          content: "这里是诊断结果。",
          agentRun: {
            ...agentRun,
            toolCalls: [
              {
                id: "tool-error",
                name: "profile_dataset",
                status: "error",
                inputSummary: "读取数据概况",
                outputSummary: "读取失败。",
                evidenceIds: [],
                error: "Kernel unavailable.",
              },
            ],
          },
        }}
        moduleById={new Map()}
      />,
    );

    expect(screen.getByText("工具调用")).toBeInTheDocument();
    expect(screen.getByText("profile_dataset · 失败")).toHaveAttribute(
      "title",
      "Kernel unavailable.",
    );
  });
});
