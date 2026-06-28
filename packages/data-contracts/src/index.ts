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

export const AiModuleMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  renderer: AiModuleRendererSchema,
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

export const ChatRequestSchema = z.object({
  creatorId: z.string(),
  messages: z.array(AgentMessageSchema),
  activeModules: z.array(z.string()).default([])
});

export const ChatResponseSchema = z.object({
  reply: z.string(),
  usedModules: z.array(z.string()),
  mode: z.enum(["mock", "llm"])
});

export type CreatorLifecycle = z.infer<typeof CreatorLifecycleSchema>;
export type CreatorGoal = z.infer<typeof CreatorGoalSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;
export type AiModuleRenderer = z.infer<typeof AiModuleRendererSchema>;
export type AudienceSegment = z.infer<typeof AudienceSegmentSchema>;
export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type TopContent = z.infer<typeof TopContentSchema>;
export type CreatorMetrics = z.infer<typeof CreatorMetricsSchema>;
export type AiModuleMetadata = z.infer<typeof AiModuleMetadataSchema>;
export type InsightAction = z.infer<typeof InsightActionSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type DiagnosisResponse = z.infer<typeof DiagnosisResponseSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type AgentTool<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  execute: (input: Input) => Output | Promise<Output>;
};
