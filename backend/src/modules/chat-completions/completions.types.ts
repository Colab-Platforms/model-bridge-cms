import type { Request } from "express";
import type z from "zod";

import type {
  ProviderChatMessage,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderUsage,
} from "../providers/adapters/base/provider.types.js";
import { chatCompletionsSchema } from "./completions.validators.js";

export type ChatCompletionsInput = z.infer<typeof chatCompletionsSchema>;

export interface ApiKeyRequestContext {
  apiKey: {
    id: string;
    name?: string | null;
  };
  project: {
    id: string;
    name?: string | null;
  };
  user: {
    id: string;
    email?: string;
  };
  creditCheck: {
    estimatedPromptTokens: number;
    maxOutputTokens: number;
    estimatedInputCost: number;
    estimatedOutputCost: number;
    platformFee: number;
    platformMarkupPercent: number;
    totalEstimatedCost: number;
    isFreeModel: boolean;
  };
}

export type ChatCompletionsRequest = Request<
  Record<string, never>,
  unknown,
  ChatCompletionsInput
> &
  ApiKeyRequestContext;

export interface ResolvedModelRecord {
  id: string;
  slug: string;
  inputPricePerToken: number;
  outputPricePerToken: number;
  provider: {
    slug: string;
    isActive: boolean;
  };
}

export interface ExecuteCompletionInput {
  body: ChatCompletionsInput;
  context: ApiKeyRequestContext;
}

export interface ExecuteStreamOptions {
  isClientConnected: () => boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
  };
  finish_reason: string | null;
}

export interface OpenAICompatibleChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAICompatibleChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ExecuteCompletionResult {
  providerResponse: ProviderChatResponse;
  response: OpenAICompatibleChatCompletionResponse;
}

export interface StreamAccumulator {
  requestId: string;
  model: string;
  usage?: ProviderUsage;
  finishReason?: string;
  content?: string;
}

export type UnifiedChatMessages = ProviderChatMessage[];
export type UnifiedChatRequest = ProviderChatRequest;
