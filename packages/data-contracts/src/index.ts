import { z } from "zod";

export const CreatorLifecycleSchema = z.enum(["new", "growing", "stable", "plateau", "commercial"]);
export const CreatorGoalSchema = z.enum([
  "increase_views",
  "grow_followers",
  "improve_interaction",
  "increase_conversion",
  "stabilize_output"
]);
export const ContentFormatSchema = z.enum(["short_video", "live", "image_text", "series", "commerce"]);
export const AiModuleRendererSchema = z.enum(["insight-card", "trend-chart", "chat-brief", "action-plan"]);
export const InsightSeveritySchema = z.enum(["positive", "notice", "warning", "critical"]);
export const ChartStyleSchema = z.enum([
  "mini-trend",
  "multi-metric-trend",
  "dual-axis-trend",
  "funnel-conversion",
  "radar-score",
  "heatmap-calendar"
]);
export const MetricSeriesKeySchema = z.enum([
  "views",
  "completionRate",
  "interactionRate",
  "followerConversionRate",
  "followersGained",
  "commerceConversionRate",
  "liveGmv"
]);
export const ChartUnitSchema = z.enum(["count", "percent", "currency", "mixed"]);

export const AudienceSegmentSchema = z.object({
  label: z.string(),
  percentage: z.number(),
  note: z.string()
});

export const CreatorProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  domain: z.string(),
  lifecycle: CreatorLifecycleSchema,
  contentFormats: z.array(ContentFormatSchema),
  goals: z.array(CreatorGoalSchema),
  bottlenecks: z.array(z.string()),
  audience: z.array(AudienceSegmentSchema),
  creatorHabits: z.array(z.string()),
  tone: z.string()
});

export const MetricPointSchema = z.object({
  date: z.string(),
  views: z.number(),
  completionRate: z.number(),
  interactionRate: z.number(),
  followerConversionRate: z.number(),
  followersGained: z.number(),
  commerceConversionRate: z.number().optional(),
  liveGmv: z.number().optional()
});

export const TopContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  views: z.number(),
  completionRate: z.number(),
  interactionRate: z.number(),
  followerConversionRate: z.number(),
  hook: z.string(),
  opportunity: z.string()
});

export const CreatorMetricsSchema = z.object({
  summary: z.object({
    views7d: z.number(),
    viewsChangePct: z.number(),
    completionRate: z.number(),
    interactionRate: z.number(),
    followerGain7d: z.number(),
    followerConversionRate: z.number(),
    publishCount7d: z.number(),
    liveGmv7d: z.number().optional(),
    commerceConversionRate: z.number().optional()
  }),
  history: z.array(MetricPointSchema),
  topContents: z.array(TopContentSchema)
});

export const ChartIntentSchema = z.object({
  style: ChartStyleSchema,
  title: z.string(),
  description: z.string().optional(),
  metricKeys: z.array(MetricSeriesKeySchema).min(1),
  unit: ChartUnitSchema,
  timeRangeDays: z.number().int().positive().optional()
});

export const AiModuleMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  renderer: AiModuleRendererSchema,
  chart: ChartIntentSchema.optional(),
  tags: z.array(z.string()),
  requiredData: z.array(z.string())
});

export const InsightActionSchema = z.object({
  label: z.string(),
  detail: z.string(),
  effort: z.enum(["low", "medium", "high"])
});

export const InsightSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: InsightSeveritySchema,
  evidence: z.array(z.string()),
  actions: z.array(InsightActionSchema),
  metricLabel: z.string().optional(),
  metricValue: z.string().optional()
});

export const DiagnosisResponseSchema = z.object({
  creator: CreatorProfileSchema,
  metrics: CreatorMetricsSchema,
  modules: z.array(AiModuleMetadataSchema),
  insights: z.array(InsightSchema)
});

export const AgentMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

export const AgentEvidenceSourceTypeSchema = z.enum([
  "creator-profile",
  "metric-summary",
  "metric-history",
  "top-content",
  "ai-module",
  "insight",
  "agent-tool",
  "llm"
]);

export const AgentConfidenceSchema = z.enum(["high", "medium", "low"]);
export const AgentRunModeSchema = z.enum(["deterministic", "llm-assisted"]);
export const AgentToolCallStatusSchema = z.enum(["pending", "running", "success", "error", "skipped"]);
export const AgentActionStatusSchema = z.enum(["suggested", "accepted", "in_progress", "done", "dismissed"]);
export const AgentActionTimeframeSchema = z.enum(["today", "tomorrow", "this_week", "next_review"]);

export const AgentEvidenceRefSchema = z.object({
  id: z.string(),
  label: z.string(),
  sourceType: AgentEvidenceSourceTypeSchema,
  sourceId: z.string().optional(),
  moduleId: z.string().optional(),
  metricKey: z.string().optional(),
  excerpt: z.string()
});

export const AgentFactSchema = z.object({
  id: z.string(),
  statement: z.string(),
  confidence: AgentConfidenceSchema,
  evidenceIds: z.array(z.string())
});

export const AgentAssumptionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  confidence: AgentConfidenceSchema,
  evidenceIds: z.array(z.string()),
  risk: z.string().optional()
});

export const AgentActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  effort: z.enum(["low", "medium", "high"]),
  timeframe: AgentActionTimeframeSchema,
  status: AgentActionStatusSchema,
  evidenceIds: z.array(z.string()),
  metricToWatch: z.string().optional()
});

export const AgentToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: AgentToolCallStatusSchema,
  inputSummary: z.string(),
  outputSummary: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
});

export const AgentRunSchema = z.object({
  id: z.string(),
  mode: AgentRunModeSchema,
  answer: z.string(),
  usedModules: z.array(z.string()),
  toolCalls: z.array(AgentToolCallSchema),
  evidence: z.array(AgentEvidenceRefSchema),
  facts: z.array(AgentFactSchema),
  assumptions: z.array(AgentAssumptionSchema),
  actions: z.array(AgentActionSchema),
  followUpQuestions: z.array(z.string()),
  createdAt: z.string()
});

export const ChatRequestSchema = z.object({
  creatorId: z.string(),
  messages: z.array(AgentMessageSchema),
  activeModules: z.array(z.string()).default([])
});

export const ChatResponseSchema = z.object({
  reply: z.string(),
  usedModules: z.array(z.string()),
  mode: z.enum(["mock", "llm"]),
  agentRun: AgentRunSchema.optional()
});

export type CreatorLifecycle = z.infer<typeof CreatorLifecycleSchema>;
export type CreatorGoal = z.infer<typeof CreatorGoalSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;
export type AiModuleRenderer = z.infer<typeof AiModuleRendererSchema>;
export type ChartStyle = z.infer<typeof ChartStyleSchema>;
export type MetricSeriesKey = z.infer<typeof MetricSeriesKeySchema>;
export type ChartUnit = z.infer<typeof ChartUnitSchema>;
export type AudienceSegment = z.infer<typeof AudienceSegmentSchema>;
export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type TopContent = z.infer<typeof TopContentSchema>;
export type CreatorMetrics = z.infer<typeof CreatorMetricsSchema>;
export type ChartIntent = z.infer<typeof ChartIntentSchema>;
export type AiModuleMetadata = z.infer<typeof AiModuleMetadataSchema>;
export type InsightAction = z.infer<typeof InsightActionSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type DiagnosisResponse = z.infer<typeof DiagnosisResponseSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type AgentEvidenceSourceType = z.infer<typeof AgentEvidenceSourceTypeSchema>;
export type AgentConfidence = z.infer<typeof AgentConfidenceSchema>;
export type AgentRunMode = z.infer<typeof AgentRunModeSchema>;
export type AgentToolCallStatus = z.infer<typeof AgentToolCallStatusSchema>;
export type AgentActionStatus = z.infer<typeof AgentActionStatusSchema>;
export type AgentActionTimeframe = z.infer<typeof AgentActionTimeframeSchema>;
export type AgentEvidenceRef = z.infer<typeof AgentEvidenceRefSchema>;
export type AgentFact = z.infer<typeof AgentFactSchema>;
export type AgentAssumption = z.infer<typeof AgentAssumptionSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentToolCall = z.infer<typeof AgentToolCallSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type AgentTool<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  execute: (input: Input) => Output | Promise<Output>;
};
