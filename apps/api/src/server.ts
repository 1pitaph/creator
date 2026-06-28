import cors from "@fastify/cors";
import { buildChatPayload } from "@creator/agent-core";
import { createDiagnosis } from "@creator/ai-modules";
import { createStructuredAgentRun } from "@creator/data-agent";
import { ChatRequestSchema, type AgentMessage } from "@creator/data-contracts";
import { getMockCreator, mockCreators } from "@creator/mock-data";
import { config } from "dotenv";
import Fastify from "fastify";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? true
});

const getDiagnosisForCreator = (creatorId: string) => {
  const creator = getMockCreator(creatorId);
  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics
  });
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const callLlm = async (messages: OpenAiMessage[]) => {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    app.log.warn({ status: response.status, detail }, "LLM request failed; falling back to mock reply");
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? null;
};

app.get("/health", async () => ({
  ok: true,
  service: "creator-ai-api"
}));

app.get("/api/creators", async () =>
  mockCreators.map(({ profile }) => ({
    id: profile.id,
    displayName: profile.displayName,
    handle: profile.handle,
    domain: profile.domain,
    lifecycle: profile.lifecycle
  }))
);

app.get("/api/creator/:id/diagnosis", async (request) => {
  const { id } = request.params as { id: string };
  return getDiagnosisForCreator(id);
});

app.post("/api/chat", async (request, reply) => {
  const parsed = ChatRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: "Invalid chat request",
      issues: parsed.error.issues
    });
  }

  const diagnosis = getDiagnosisForCreator(parsed.data.creatorId);
  const context = {
    creator: diagnosis.creator,
    metrics: diagnosis.metrics,
    modules: diagnosis.modules.filter(
      (module) => parsed.data.activeModules.length === 0 || parsed.data.activeModules.includes(module.id)
    ),
    insights: diagnosis.insights.filter(
      (insight) => parsed.data.activeModules.length === 0 || parsed.data.activeModules.includes(insight.moduleId)
    )
  };

  const payload = buildChatPayload(context, parsed.data.messages as AgentMessage[]);
  const llmReply = await callLlm(payload);

  const agentRun = createStructuredAgentRun({
    diagnosis,
    messages: parsed.data.messages as AgentMessage[],
    activeModules: parsed.data.activeModules,
    llmAnswer: llmReply
  });

  return {
    reply: agentRun.answer,
    usedModules: agentRun.usedModules,
    mode: llmReply ? "llm" : "mock",
    agentRun
  };
});

const port = Number(process.env.PORT ?? 8787);

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
