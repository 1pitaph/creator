import type { TopContent } from "@creator/data-contracts";

import { MiniAskButton } from "../../../components/effects/AskAgentButton";
import { formatCompact, formatPct } from "../../../lib/format";
import type { AskTarget } from "../../../types";
import { Stat } from "./Stat";

export const TopContentTile = ({ content, onAsk }: { content: TopContent; onAsk: (target: AskTarget) => void }) => (
  <article className="group/row relative rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024)] transition hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_rgba(24,24,27,0.055)]">
    <MiniAskButton
      label={content.title}
      onClick={() =>
        onAsk({
          title: content.title,
          moduleId: "viral-review",
          prompt: `请拆解高表现内容「${content.title}」，提炼它的 hook、标题结构和下一条复用方案。`,
          summary: content.opportunity,
          evidence: [`播放 ${formatCompact(content.views)}`, `完播 ${formatPct(content.completionRate)}`, `转粉 ${formatPct(content.followerConversionRate)}`]
        })
      }
    />
    <div className="pr-10">
      <p className="text-sm font-semibold text-zinc-950">{content.title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="播放" value={formatCompact(content.views)} />
        <Stat label="完播" value={formatPct(content.completionRate)} />
        <Stat label="转粉" value={formatPct(content.followerConversionRate)} />
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{content.opportunity}</p>
    </div>
  </article>
);
