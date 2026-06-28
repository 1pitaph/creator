import { memo } from "react";

import type { AiModuleMetadata } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";

import type { UiMessage } from "../../types";

export const ChatBubble = memo(function ChatBubble({
  message,
  moduleById
}: {
  message: UiMessage;
  moduleById: Map<string, AiModuleMetadata>;
}) {
  const isAssistant = message.role === "assistant";
  const usedModuleNames = message.usedModules?.map((moduleId) => moduleById.get(moduleId)?.name ?? moduleId).filter(Boolean);

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div className={cn("max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6", isAssistant ? "bg-zinc-100 text-zinc-800" : "bg-zinc-950 text-white")}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isAssistant && usedModuleNames && usedModuleNames.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.mode ? <Badge tone={message.mode === "llm" ? "green" : "neutral"}>{message.mode}</Badge> : null}
            {usedModuleNames.slice(0, 3).map((name) => (
              <Badge key={name} tone="blue">
                {name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});
