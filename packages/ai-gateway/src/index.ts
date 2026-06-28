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
};

export type AiGatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  system?: string;
  messages: AiGatewayMessage[];
  temperature?: number;
};

export type StreamTextInput = GenerateTextInput;

export type GatewayTextStream = AsyncIterable<string>;

export const getAiGatewayConfig = (): AiGatewayConfig => ({
  apiKey: process.env.LLM_API_KEY,
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  providerName: process.env.LLM_PROVIDER_NAME ?? "openai-compatible",
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
  const model = createGatewayModel(config);

  if (!model) {
    return null;
  }

  const result = await generateText({
    model,
    system: getSystemPrompt(input),
    messages: toModelMessages(input.messages),
    temperature: input.temperature ?? 0.4,
  });

  return result.text.trim();
};

export const streamGatewayText = (
  input: StreamTextInput,
  config?: AiGatewayConfig,
): GatewayTextStream | null => {
  const model = createGatewayModel(config);

  if (!model) {
    return null;
  }

  const result = streamText({
    model,
    system: getSystemPrompt(input),
    messages: toModelMessages(input.messages),
    temperature: input.temperature ?? 0.4,
  });

  return result.textStream;
};
