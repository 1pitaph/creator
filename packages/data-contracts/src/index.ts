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
  content: z.string(),
  localOnly: z.boolean().optional()
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

const JsonRecordSchema = z.record(z.string(), z.unknown());

export const AgentRunPatchSchema = z.object({
  id: z.string(),
  answer: z.string().optional(),
  usedModules: z.array(z.string()).optional(),
  toolCalls: z.array(AgentToolCallSchema).optional(),
  evidence: z.array(AgentEvidenceRefSchema).optional(),
  facts: z.array(AgentFactSchema).optional(),
  assumptions: z.array(AgentAssumptionSchema).optional(),
  actions: z.array(AgentActionSchema).optional(),
  followUpQuestions: z.array(z.string()).optional()
});

export const AgentThreadStatusSchema = z.enum(["idle", "running", "awaiting_approval", "completed", "error"]);

export const AgentApprovalDecisionSchema = z.enum(["approve", "deny"]);

export const AgentApprovalRequestSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  actionIds: z.array(z.string()),
  title: z.string(),
  detail: z.string(),
  risk: z.string().optional(),
  createdAt: z.string()
});

export const AgentResumeRequestSchema = z.object({
  threadId: z.string(),
  approvalId: z.string(),
  decision: AgentApprovalDecisionSchema,
  note: z.string().optional()
});

export const AgentResumeResponseSchema = z.object({
  threadId: z.string(),
  status: AgentThreadStatusSchema,
  agentRun: AgentRunSchema.optional(),
  approval: AgentApprovalRequestSchema.optional()
});

export const AgentStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("thread"),
    threadId: z.string(),
    status: AgentThreadStatusSchema
  }),
  z.object({
    type: z.literal("text-delta"),
    delta: z.string()
  }),
  z.object({
    type: z.literal("tool-call"),
    toolCall: AgentToolCallSchema
  }),
  z.object({
    type: z.literal("agent-run"),
    agentRun: AgentRunSchema
  }),
  z.object({
    type: z.literal("agent-run-patch"),
    patch: AgentRunPatchSchema
  }),
  z.object({
    type: z.literal("approval-requested"),
    approval: AgentApprovalRequestSchema
  }),
  z.object({
    type: z.literal("finish"),
    threadId: z.string().optional(),
    status: AgentThreadStatusSchema,
    agentRun: AgentRunSchema.optional()
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: z.string().optional()
  })
]);

export const AgentChatMetadataSchema = z.object({
  agentRunId: z.string().optional(),
  mode: z.enum(["mock", "llm", "local"]).optional(),
  usedModules: z.array(z.string()).optional(),
  threadId: z.string().optional(),
  finishReason: z.string().optional(),
  localOnly: z.boolean().optional()
});

export const DatasetSnapshotSchema = z.object({
  profile: CreatorProfileSchema,
  summary: CreatorMetricsSchema.shape.summary,
  history: z.array(MetricPointSchema),
  topContents: z.array(TopContentSchema)
});

export const DataKernelToolNameSchema = z.enum(["profile_dataset", "create_chart_data", "explain_metric_drop", "run_sql"]);

export const DataKernelLimitsSchema = z.object({
  maxRows: z.number().int().positive().default(200),
  maxExecutionMs: z.number().int().positive().default(3000),
  maxColumns: z.number().int().positive().default(40)
});

export const DataKernelRequestSchema = z.object({
  requestId: z.string(),
  tool: DataKernelToolNameSchema,
  creatorId: z.string(),
  dataset: DatasetSnapshotSchema,
  input: JsonRecordSchema.default({}),
  limits: DataKernelLimitsSchema.default({})
});

export const DataKernelEvidenceSchema = z.object({
  sourceTable: z.string(),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(z.string()),
  excerpt: z.string(),
  metricKey: z.string().optional()
});

export const DataKernelArtifactSchema = z.object({
  id: z.string(),
  kind: z.enum(["table", "chart", "profile", "explanation"]),
  title: z.string(),
  data: z.unknown()
});

export const DataKernelErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  detail: z.string().optional()
});

export const DataKernelResponseSchema = z.object({
  ok: z.boolean(),
  requestId: z.string(),
  tool: DataKernelToolNameSchema,
  result: z.unknown().optional(),
  evidence: z.array(DataKernelEvidenceSchema).default([]),
  artifacts: z.array(DataKernelArtifactSchema).default([]),
  stats: JsonRecordSchema.default({}),
  warnings: z.array(z.string()).default([]),
  error: DataKernelErrorSchema.optional()
});

export const ChatRequestSchema = z.object({
  creatorId: z.string(),
  messages: z.array(AgentMessageSchema),
  activeModules: z.array(z.string()).default([]),
  threadId: z.string().optional(),
  focus: z
    .object({
      title: z.string(),
      moduleId: z.string().optional()
    })
    .optional()
});

export const ChatResponseSchema = z.object({
  reply: z.string(),
  usedModules: z.array(z.string()),
  mode: z.enum(["mock", "llm"]),
  agentRun: AgentRunSchema.optional(),
  threadId: z.string().optional(),
  status: AgentThreadStatusSchema.optional(),
  approval: AgentApprovalRequestSchema.optional()
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
export type AgentRunPatch = z.infer<typeof AgentRunPatchSchema>;
export type AgentThreadStatus = z.infer<typeof AgentThreadStatusSchema>;
export type AgentApprovalDecision = z.infer<typeof AgentApprovalDecisionSchema>;
export type AgentApprovalRequest = z.infer<typeof AgentApprovalRequestSchema>;
export type AgentResumeRequest = z.infer<typeof AgentResumeRequestSchema>;
export type AgentResumeResponse = z.infer<typeof AgentResumeResponseSchema>;
export type AgentStreamEvent = z.infer<typeof AgentStreamEventSchema>;
export type AgentChatMetadata = z.infer<typeof AgentChatMetadataSchema>;
export type DatasetSnapshot = z.infer<typeof DatasetSnapshotSchema>;
export type DataKernelToolName = z.infer<typeof DataKernelToolNameSchema>;
export type DataKernelLimits = z.infer<typeof DataKernelLimitsSchema>;
export type DataKernelRequest = z.infer<typeof DataKernelRequestSchema>;
export type DataKernelEvidence = z.infer<typeof DataKernelEvidenceSchema>;
export type DataKernelArtifact = z.infer<typeof DataKernelArtifactSchema>;
export type DataKernelError = z.infer<typeof DataKernelErrorSchema>;
export type DataKernelResponse = z.infer<typeof DataKernelResponseSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type AgentTool<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  execute: (input: Input) => Output | Promise<Output>;
};
