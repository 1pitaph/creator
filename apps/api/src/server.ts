import cors from "@fastify/cors";
import {
  invokeAgentGraph,
  resumeAgentGraph,
  streamAgentGraphEvents,
  toLegacyChatResponse,
} from "@creator/agent-graph";
import { createDiagnosis } from "@creator/ai-modules";
import {
  AgentResumeRequestSchema,
  ChatRequestSchema,
  type AgentChatMetadata,
  type AgentRunPatch,
  type AgentStreamEvent,
} from "@creator/data-contracts";
import { getMockCreator, mockCreators } from "@creator/mock-data";
import {
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { config } from "dotenv";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const getDiagnosisForCreator = (creatorId: string) => {
  const creator = getMockCreator(creatorId);
  return createDiagnosis({
    profile: creator.profile,
    metrics: creator.metrics,
  });
};

export const buildApiApp = async () => {
  const app = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : true,
  });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? true,
  });

  app.get("/health", async () => ({
    ok: true,
    service: "creator-ai-api",
  }));

  app.get("/api/creators", async () =>
    mockCreators.map(({ profile }) => ({
      id: profile.id,
      displayName: profile.displayName,
      handle: profile.handle,
      domain: profile.domain,
      lifecycle: profile.lifecycle,
    })),
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
        issues: parsed.error.issues,
      });
    }

    const diagnosis = getDiagnosisForCreator(parsed.data.creatorId);
    const result = await invokeAgentGraph({
      request: parsed.data,
      diagnosis,
    });

    return toLegacyChatResponse(result);
  });

  const writeDataChunk = (
    writer: { write: (part: UIMessageChunk) => void },
    name: string,
    data: unknown,
    id: string = randomUUID(),
  ) => {
    writer.write({
      type: `data-${name}`,
      id,
      data,
    } as UIMessageChunk);
  };

  const writeToolEvent = (
    writer: { write: (part: UIMessageChunk) => void },
    event: Extract<AgentStreamEvent, { type: "tool-call" }>,
  ) => {
    writer.write({
      type: "tool-input-available",
      toolCallId: event.toolCall.id,
      toolName: event.toolCall.name,
      input: {
        inputSummary: event.toolCall.inputSummary,
        evidenceIds: event.toolCall.evidenceIds,
      },
      title: event.toolCall.name,
    });

    if (event.toolCall.status === "error") {
      writer.write({
        type: "tool-output-error",
        toolCallId: event.toolCall.id,
        errorText: event.toolCall.error ?? "Tool execution failed.",
      });
      return;
    }

    writer.write({
      type: "tool-output-available",
      toolCallId: event.toolCall.id,
      output: {
        status: event.toolCall.status,
        outputSummary: event.toolCall.outputSummary,
      },
    });
  };

  app.post("/api/chat/stream", async (request, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid chat request",
        issues: parsed.error.issues,
      });
    }

    const diagnosis = getDiagnosisForCreator(parsed.data.creatorId);
    const textId = `text-${randomUUID()}`;
    let finalMetadata: AgentChatMetadata = {
      threadId: parsed.data.threadId,
      mode: "mock",
    };
    let textStarted = false;
    const abortController = new AbortController();

    const stream = createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        writer.write({
          type: "start",
          messageMetadata: finalMetadata,
        });

        for await (const event of streamAgentGraphEvents({
          request: parsed.data,
          diagnosis,
          abortSignal: abortController.signal,
        })) {
          switch (event.type) {
            case "thread":
              finalMetadata = {
                ...finalMetadata,
                checkpoint: event.checkpoint,
                threadId: event.threadId,
              };
              writeDataChunk(writer, "agent-thread", event, event.threadId);
              break;
            case "tool-call":
              writeToolEvent(writer, event);
              writeDataChunk(
                writer,
                "agent-tool-call",
                event.toolCall,
                event.toolCall.id,
              );
              break;
            case "agent-run-patch":
              writeDataChunk(
                writer,
                "agent-run-patch",
                event.patch satisfies AgentRunPatch,
                event.patch.id,
              );
              break;
            case "text-delta":
              if (!textStarted) {
                writer.write({ type: "text-start", id: textId });
                textStarted = true;
              }
              writer.write({
                type: "text-delta",
                id: textId,
                delta: event.delta,
              });
              break;
            case "agent-run":
              finalMetadata = {
                ...finalMetadata,
                agentRunId: event.agentRun.id,
                mode: event.agentRun.mode === "llm-assisted" ? "llm" : "mock",
                usedModules: event.agentRun.usedModules,
              };
              writeDataChunk(
                writer,
                "agent-run",
                event.agentRun,
                event.agentRun.id,
              );
              break;
            case "approval-requested":
              writeDataChunk(
                writer,
                "agent-approval",
                event.approval,
                event.approval.id,
              );
              break;
            case "finish":
              finalMetadata = {
                ...finalMetadata,
                agentRunId: event.agentRun?.id ?? finalMetadata.agentRunId,
                finishReason: event.status,
                threadId: event.threadId ?? finalMetadata.threadId,
                usedModules:
                  event.agentRun?.usedModules ?? finalMetadata.usedModules,
              };
              writeDataChunk(
                writer,
                "agent-finish",
                event,
                event.threadId ?? randomUUID(),
              );
              break;
            case "error":
              writer.write({ type: "error", errorText: event.message });
              break;
          }
        }

        if (textStarted) {
          writer.write({ type: "text-end", id: textId });
        }

        writer.write({
          type: "message-metadata",
          messageMetadata: finalMetadata,
        });

        writer.write({
          type: "finish",
          finishReason: "stop",
          messageMetadata: finalMetadata,
        });
      },
      onError: (error) => {
        app.log.error(error, "Agent stream failed");
        return "Agent stream failed.";
      },
    });

    reply.hijack();
    reply.raw.on("close", () => {
      if (!reply.raw.writableEnded) {
        abortController.abort();
      }
    });
    pipeUIMessageStreamToResponse({
      response: reply.raw,
      stream,
    });
  });

  app.post("/api/chat/resume", async (request, reply) => {
    const parsed = AgentResumeRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid resume request",
        issues: parsed.error.issues,
      });
    }

    return resumeAgentGraph({
      request: parsed.data,
    });
  });

  return app;
};

export const startApiServer = async () => {
  const app = await buildApiApp();
  const port = Number(process.env.PORT ?? 8787);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await startApiServer();
}
