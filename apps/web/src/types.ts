import type {
  AgentApprovalRequest,
  AgentMessage,
  AgentRun,
  AgentToolCall,
  AiModuleMetadata,
  ChartIntent,
  CreatorMetrics,
  DiagnosisResponse,
  InsightAction,
  TopContent,
} from "@creator/data-contracts";

export type UiMessage = AgentMessage & {
  id: string;
  mode?: "mock" | "llm" | "local";
  usedModules?: string[];
  agentRun?: AgentRun;
  toolCalls?: AgentToolCall[];
  approval?: AgentApprovalRequest;
  threadId?: string;
  notice?: {
    label: string;
    tone: "info" | "warning" | "error";
  };
};

export type AskTarget = {
  title: string;
  prompt: string;
  moduleId?: string;
  summary?: string;
  evidence?: string[];
};

export type MetricTone = "sky" | "emerald" | "amber" | "rose" | "violet";

export type MetricDefinition = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
  trendLabel: string;
  trend: "up" | "down" | "flat";
  chartIntent: ChartIntent;
  askTarget: AskTarget;
};

export type DashboardAction = InsightAction & {
  moduleId: string;
  insightTitle: string;
};

export type DashboardPanel = "overview" | "board" | "table";

export type DashboardViewModel = {
  activeModuleIds: string[];
  actionQueue: DashboardAction[];
  healthScore: number;
  metricCards: MetricDefinition[];
  metrics: CreatorMetrics;
  moduleById: Map<string, AiModuleMetadata>;
  trendComparisonChart: ChartIntent;
  topContent?: TopContent;
  topInsight?: DiagnosisResponse["insights"][number];
};

export type AgentCommand =
  | {
      id: string;
      type: "open";
    }
  | {
      id: string;
      type: "ask";
      target: AskTarget;
    };
