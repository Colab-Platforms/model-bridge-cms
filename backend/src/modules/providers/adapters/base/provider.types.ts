import {
  DEFAULT_PROVIDER_RETRY_COUNT,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  PROVIDER_NAMES,
} from "./provider.constants.js";

export type ProviderName = (typeof PROVIDER_NAMES)[number];

export interface ProviderTextContentPart {
  type: "text";
  text: string;
  cache_control?: {
    type: "ephemeral";
  };
}

export interface ProviderImageUrlContentPart {
  type: "image_url";
  image_url: {
    url: string;
  };
  cache_control?: {
    type: "ephemeral";
  };
}

export type ProviderContentPart =
  | ProviderTextContentPart
  | ProviderImageUrlContentPart;

export interface ProviderChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ProviderContentPart[];
  name?: string;
  toolCallId?: string;
}

export interface ProviderChatRequest {
  model: string;
  messages: ProviderChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderChatResponse {
  requestId: string;
  provider: string;
  model: string;
  content: string;
  finishReason?: string;
  usage: ProviderUsage;
  metrics: {
    latencyMs: number;
    responseCompletionTimeMs: number;
  };
  rawResponse?: unknown;
}

export interface ProviderStreamEvent {
  type: "start" | "content" | "end";
  requestId: string;
  provider: string;
  model: string;
  delta?: string;
  finishReason?: string;
  usage?: ProviderUsage;
  rawChunk?: unknown;
}

export interface ProviderEmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface ProviderEmbeddingResponse {
  requestId: string;
  provider: string;
  model: string;
  embeddings: number[][];
  usage?: ProviderUsage;
  rawResponse?: unknown;
}

export interface ProviderHealthCheckResult {
  provider: string;
  isHealthy: boolean;
  latencyMs: number;
  message?: string;
  rawResponse?: unknown;
}

export interface ProviderLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ProviderRuntimeConfig {
  name: ProviderName;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
}

export interface ProviderMetadata {
  name: ProviderName;
  displayName: string;
  apiKeyEnvVar: string;
  baseUrlEnvVar: string;
  defaultBaseUrl: string;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}

export interface ProviderHttpRequestOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface ProviderFactoryDependencies {
  logger?: ProviderLogger;
}

export const createDefaultProviderRuntimeConfig = (
  config: Pick<ProviderRuntimeConfig, "name" | "apiKey" | "baseUrl"> &
    Partial<Pick<ProviderRuntimeConfig, "timeoutMs" | "maxRetries" | "headers">>
): ProviderRuntimeConfig => ({
  name: config.name,
  apiKey: config.apiKey,
  baseUrl: config.baseUrl,
  timeoutMs: config.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS,
  maxRetries: config.maxRetries ?? DEFAULT_PROVIDER_RETRY_COUNT,
  headers: config.headers,
});
