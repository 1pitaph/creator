import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText, type CoreMessage, type LanguageModel } from "ai";

export type AiGatewayConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  providerName?: string;
};

export type GenerateTextInput = {
  system?: string;
  messages: CoreMessage[];
  temperature?: number;
};

export type StreamTextInput = GenerateTextInput;

export const getAiGatewayConfig = (): AiGatewayConfig => ({
  apiKey: process.env.LLM_API_KEY,
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  providerName: process.env.LLM_PROVIDER_NAME ?? "openai-compatible"
});

export const isLlmConfigured = (config: AiGatewayConfig = getAiGatewayConfig()) => Boolean(config.apiKey);

export const createGatewayModel = (config: AiGatewayConfig = getAiGatewayConfig()): LanguageModel | null => {
  if (!isLlmConfigured(config)) {
    return null;
  }

  const provider = createOpenAICompatible({
    name: config.providerName ?? "openai-compatible",
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  });

  return provider(config.model ?? "gpt-4o-mini");
};

export const generateGatewayText = async (input: GenerateTextInput, config?: AiGatewayConfig) => {
  const model = createGatewayModel(config);

  if (!model) {
    return null;
  }

  const result = await generateText({
    model,
    system: input.system,
    messages: input.messages,
    temperature: input.temperature ?? 0.4
  });

  return result.text.trim();
};

export const streamGatewayText = (input: StreamTextInput, config?: AiGatewayConfig) => {
  const model = createGatewayModel(config);

  if (!model) {
    return null;
  }

  return streamText({
    model,
    system: input.system,
    messages: input.messages,
    temperature: input.temperature ?? 0.4
  });
};
