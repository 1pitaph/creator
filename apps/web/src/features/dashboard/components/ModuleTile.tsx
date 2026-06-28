import { ChartBar } from "@phosphor-icons/react/ChartBar";
import { ChatText } from "@phosphor-icons/react/ChatText";
import { Compass } from "@phosphor-icons/react/Compass";
import { Pulse } from "@phosphor-icons/react/Pulse";

import type { AiModuleMetadata } from "@creator/data-contracts";
import { Badge } from "@creator/ui";

import { MiniAskButton } from "../../../components/effects/AskAgentButton";
import { phosphorIconWeight } from "../../../constants";
import type { AskTarget } from "../../../types";

export const ModuleTile = ({ module, onAsk }: { module: AiModuleMetadata; onAsk: (target: AskTarget) => void }) => {
  const Icon = module.renderer === "trend-chart" ? ChartBar : module.renderer === "action-plan" ? Compass : module.renderer === "chat-brief" ? ChatText : Pulse;

  return (
    <article className="group/row relative rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
      <MiniAskButton
        label={module.name}
        onClick={() =>
          onAsk({
            title: module.name,
            moduleId: module.id,
            prompt: `请解释「${module.name}」模块当前看到了什么，并给我该模块下最值得执行的建议。`,
            summary: module.description,
            evidence: module.tags
          })
        }
      />
      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-800 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.65)]">
          <Icon className="h-4 w-4" weight={phosphorIconWeight} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{module.name}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{module.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {module.tags.map((tag) => (
          <Badge key={tag} tone="neutral">
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  );
};
