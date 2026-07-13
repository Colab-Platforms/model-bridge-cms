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

export interface ProviderFunctionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export type ProviderTool = ProviderFunctionTool;

export type ProviderToolChoice =
  | "auto"
  | "none"
  | "required"
  | {
      type: "function";
      function: {
        name: string;
      };
    };

export interface ProviderToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ProviderToolCallDelta {
  index: number;
  id?: string | null;
  type?: "function" | null;
  function?: {
    name?: string | null;
    arguments?: string;
  };
}

export interface ProviderChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ProviderContentPart[] | null;
  name?: string;
  toolCallId?: string;
  toolCalls?: ProviderToolCall[];
}

export interface ProviderChatRequest {
  model: string;
  messages: ProviderChatMessage[];
  modalities?: string[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ProviderTool[];
  toolChoice?: ProviderToolChoice;
  cacheControl?: {
    type: "ephemeral";
  };
}

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedPromptTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface ProviderChatResponse {
  requestId: string;
  provider: string;
  model: string;
  content: string | ProviderContentPart[] | null;
  finishReason?: string;
  usage: ProviderUsage;
  toolCalls?: ProviderToolCall[];
  metrics: {
    latencyMs: number;
    responseCompletionTimeMs: number;
  };
  rawResponse?: unknown;
}

export interface ProviderStreamStartEvent {
  type: "start";
  requestId: string;
  provider: string;
  model: string;
  usage?: ProviderUsage;
  rawChunk?: unknown;
}

export interface ProviderStreamContentEvent {
  type: "content";
  requestId: string;
  provider: string;
  model: string;
  delta?: string;
  finishReason?: string;
  usage?: ProviderUsage;
  rawChunk?: unknown;
}

export interface ProviderStreamToolCallEvent {
  type: "tool_call";
  requestId: string;
  provider: string;
  model: string;
  toolCallDeltas: ProviderToolCallDelta[];
  finishReason?: string;
  usage?: ProviderUsage;
  rawChunk?: unknown;
}

export interface ProviderStreamEndEvent {
  type: "end";
  requestId: string;
  provider: string;
  model: string;
  finishReason?: string;
  usage?: ProviderUsage;
  rawChunk?: unknown;
}

export type ProviderStreamEvent =
  | ProviderStreamStartEvent
  | ProviderStreamContentEvent
  | ProviderStreamToolCallEvent
  | ProviderStreamEndEvent;

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
