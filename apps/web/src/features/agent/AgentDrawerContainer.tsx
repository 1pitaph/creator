import { useEffect, useMemo, useRef } from "react";

import type { DiagnosisResponse } from "@creator/data-contracts";

import type { AgentCommand } from "../../types";
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

  return (
    <>
      <AgentDrawer
        open={chat.open}
        onClose={chat.close}
        messages={chat.messages}
        draft={chat.draft}
        isChatting={chat.isChatting}
        onDraftChange={chat.setDraft}
        onSubmit={chat.handleSubmit}
        onAskPreset={chat.askPreset}
        onStopGeneration={chat.stopGeneration}
        approval={chat.currentApproval}
        onApproveApproval={chat.approveApproval}
        onDenyApproval={chat.denyApproval}
        isResumingApproval={chat.isResumingApproval}
        moduleById={moduleById}
        endRef={chat.endRef}
        focus={chat.focus}
      />
      <AgentFloatingButton
        hasPendingApproval={Boolean(chat.currentApproval)}
        isChatting={chat.isChatting}
        open={chat.open}
        onOpen={chat.openAgent}
      />
    </>
  );
};
