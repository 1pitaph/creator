import { useEffect, useMemo, useRef, useState } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";

import type { AgentCommand, UiMessage } from "../../types";
import { AgentDrawer } from "./AgentDrawer";
import { AgentFloatingButton } from "./AgentFloatingButton";
import { useAgentChat } from "./useAgentChat";

export const AgentDrawerContainer = ({
  activeModuleIds,
  command,
  creatorId,
  diagnosis,
}: {
  activeModuleIds: string[];
  command: AgentCommand | null;
  creatorId: string;
  diagnosis: DiagnosisResponse;
}) => {
  const processedCommandIdRef = useRef<string | null>(null);
  const moduleById = useMemo(
    () => new Map(diagnosis.modules.map((module) => [module.id, module])),
    [diagnosis.modules],
  );
  const chat = useAgentChat({
    activeModuleIds,
    creatorId,
    diagnosis,
  });
  const latestAssistantMessageToken = useMemo(
    () => createLatestAssistantMessageToken(chat.messages),
    [chat.messages],
  );
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const hasInitializedUnreadTrackingRef = useRef(false);
  const lastSeenAssistantMessageTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!command || processedCommandIdRef.current === command.id) {
      return;
    }

    processedCommandIdRef.current = command.id;

    if (command.type === "open") {
      chat.openAgent();
      return;
    }

    chat.askTarget(command.target);
  }, [chat, command]);

  useEffect(() => {
    if (!hasInitializedUnreadTrackingRef.current) {
      hasInitializedUnreadTrackingRef.current = true;
      lastSeenAssistantMessageTokenRef.current = latestAssistantMessageToken;
      return;
    }

    if (chat.open) {
      lastSeenAssistantMessageTokenRef.current = latestAssistantMessageToken;
      setHasUnreadMessage(false);
      return;
    }

    if (
      latestAssistantMessageToken &&
      latestAssistantMessageToken !== lastSeenAssistantMessageTokenRef.current
    ) {
      setHasUnreadMessage(true);
    }
  }, [chat.open, latestAssistantMessageToken]);

  return (
    <>
      <AgentDrawer
        open={chat.open}
        onClose={chat.close}
        messages={chat.messages}
        isChatting={chat.isChatting}
        onSendMessage={(question) =>
          chat.submitQuestion(
            question,
            chat.focus?.moduleId ? [chat.focus.moduleId] : activeModuleIds,
          )
        }
        onAskPreset={chat.askPreset}
        onStopGeneration={chat.stopGeneration}
        approval={chat.currentApproval}
        onApproveApproval={chat.approveApproval}
        onDenyApproval={chat.denyApproval}
        isResumingApproval={chat.isResumingApproval}
        moduleById={moduleById}
        focus={chat.focus}
      />
      <AgentFloatingButton
        hasPendingApproval={Boolean(chat.currentApproval)}
        hasUnreadMessage={hasUnreadMessage}
        isChatting={chat.isChatting}
        open={chat.open}
        onOpen={chat.openAgent}
      />
    </>
  );
};

const createLatestAssistantMessageToken = (messages: UiMessage[]) => {
  const latestAssistantMessage = messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  if (!latestAssistantMessage) {
    return null;
  }

  return [
    latestAssistantMessage.id,
    latestAssistantMessage.content,
    latestAssistantMessage.approval?.id ?? "",
    latestAssistantMessage.agentRun?.id ?? "",
  ].join("\u001f");
};
