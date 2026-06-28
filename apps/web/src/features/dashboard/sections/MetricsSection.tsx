import type { AskTarget, MetricDefinition } from "../../../types";
import { MetricPanel } from "../components/MetricPanel";
import { SectionHeading } from "../components/SectionHeading";

export const MetricsSection = ({ metricCards, onAsk }: { metricCards: MetricDefinition[]; onAsk: (target: AskTarget) => void }) => (
  <section>
    <SectionHeading
      eyebrow="Performance Modules"
      title="核心数据模块"
      description="每张卡片都可以单独唤起 AI Agent，Agent 会带着该模块的上下文回答。"
    />
    <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {metricCards.map((metric) => (
        <MetricPanel key={metric.id} metric={metric} onAsk={onAsk} />
      ))}
    </div>
  </section>
);
