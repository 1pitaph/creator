import type { AgentMessage, AgentResumeRequest, AgentResumeResponse, AgentRun } from "@creator/data-contracts";

export type ChatRequestPayload = {
  activeModules: string[];
  creatorId: string;
  messages: Array<Pick<AgentMessage, "role" | "content">>;
};

export type ChatReplyPayload = {
  reply: string;
  usedModules: string[];
  mode: "mock" | "llm";
  agentRun?: AgentRun;
};

export type ChatFetcher = (payload: ChatRequestPayload, signal?: AbortSignal) => Promise<ChatReplyPayload>;

export const fetchAgentReply: ChatFetcher = async (payload, signal) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    throw new Error("Chat request failed");
  }

  return (await response.json()) as ChatReplyPayload;
};

export type ResumeAgentApprovalFetcher = (payload: AgentResumeRequest) => Promise<AgentResumeResponse>;

export const resumeAgentApproval: ResumeAgentApprovalFetcher = async (payload) => {
  const response = await fetch("/api/chat/resume", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Agent resume request failed");
  }

  return (await response.json()) as AgentResumeResponse;
};
