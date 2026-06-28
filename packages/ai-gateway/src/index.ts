import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  generateText,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from "ai";

export type AiGatewayConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  providerName?: string;
  timeoutMs?: number;
};

export type AiGatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  abortSignal?: AbortSignal;
  system?: string;
  messages: AiGatewayMessage[];
  temperature?: number;
};

export type StreamTextInput = GenerateTextInput & {
  abortSignal?: AbortSignal;
};

export type GatewayTextStream = AsyncIterable<string>;

const DEFAULT_LLM_TIMEOUT_MS = 30_000;

const parsePositiveInteger = (value: string | undefined) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const getAiGatewayConfig = (): AiGatewayConfig => ({
  apiKey: process.env.LLM_API_KEY,
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  providerName: process.env.LLM_PROVIDER_NAME ?? "openai-compatible",
  timeoutMs:
    parsePositiveInteger(process.env.LLM_TIMEOUT_MS) ?? DEFAULT_LLM_TIMEOUT_MS,
});

export const isLlmConfigured = (
  config: AiGatewayConfig = getAiGatewayConfig(),
) => Boolean(config.apiKey);

const getSystemPrompt = (input: GenerateTextInput) =>
  [
    input.system,
    ...input.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content),
  ]
    .filter((item): item is string => Boolean(item?.trim()))
    .join("\n\n");

const toModelMessages = (messages: AiGatewayMessage[]): ModelMessage[] =>
  messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

const createTimedAbortSignal = (
  sourceSignal: AbortSignal | undefined,
  timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
) => {
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;

  if (!timeout) {
    return {
      cleanup: () => undefined,
      signal: sourceSignal,
    };
  }

  const controller = new AbortController();
  const abortFromSource = () => {
    controller.abort(sourceSignal?.reason ?? new Error("LLM request aborted."));
  };
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`LLM request timed out after ${timeout}ms.`));
  }, timeout);

  if (sourceSignal?.aborted) {
    abortFromSource();
  } else {
    sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
  }

  return {
    cleanup: () => {
      clearTimeout(timeoutId);
      sourceSignal?.removeEventListener("abort", abortFromSource);
    },
    signal: controller.signal,
  };
};

const withCleanup = async function* <T>(
  stream: AsyncIterable<T>,
  cleanup: () => void,
): AsyncGenerator<T> {
  try {
    yield* stream;
  } finally {
    cleanup();
  }
};

export const createGatewayModel = (
  config: AiGatewayConfig = getAiGatewayConfig(),
): LanguageModel | null => {
  const apiKey = config.apiKey;

  if (!apiKey) {
    return null;
  }

  const provider = createOpenAICompatible({
    name: config.providerName ?? "openai-compatible",
    apiKey,
    baseURL: config.baseUrl ?? "https://api.openai.com/v1",
  });

  return provider(config.model ?? "gpt-4o-mini");
};

export const generateGatewayText = async (
  input: GenerateTextInput,
  config?: AiGatewayConfig,
) => {
  const gatewayConfig = config ?? getAiGatewayConfig();
  const model = createGatewayModel(gatewayConfig);

  if (!model) {
    return null;
  }

  const timedAbort = createTimedAbortSignal(
    input.abortSignal,
    gatewayConfig.timeoutMs,
  );

  try {
    const result = await generateText({
      abortSignal: timedAbort.signal,
      model,
      system: getSystemPrompt(input),
      messages: toModelMessages(input.messages),
      temperature: input.temperature ?? 0.4,
    });

    return result.text.trim();
  } finally {
    timedAbort.cleanup();
  }
};

export const streamGatewayText = (
  input: StreamTextInput,
  config?: AiGatewayConfig,
): GatewayTextStream | null => {
  const gatewayConfig = config ?? getAiGatewayConfig();
  const model = createGatewayModel(gatewayConfig);

  if (!model) {
    return null;
  }

  const timedAbort = createTimedAbortSignal(
    input.abortSignal,
    gatewayConfig.timeoutMs,
  );
  let result: ReturnType<typeof streamText>;

  try {
    result = streamText({
      abortSignal: timedAbort.signal,
      model,
      system: getSystemPrompt(input),
      messages: toModelMessages(input.messages),
      temperature: input.temperature ?? 0.4,
    });
  } catch (error) {
    timedAbort.cleanup();
    throw error;
  }

  return withCleanup(result.textStream, timedAbort.cleanup);
};
