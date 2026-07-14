import type { ComplexityTier, PlanTier } from "@prisma/client";
import type { Request } from "express";
import type z from "zod";

import type {
  ProviderChatMessage,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderContentPart,
  ProviderTool,
  ProviderToolCall,
  ProviderToolCallDelta,
  ProviderToolChoice,
  ProviderUsage,
} from "../providers/adapters/base/provider.types.js";
import type { BillingResult } from "../../services/inference-tracking.service.js";
import { chatCompletionsSchema } from "./completions.validators.js";

export type ChatCompletionsInput = z.infer<typeof chatCompletionsSchema>;

export type SingleModelChatCompletionsInput = Omit<ChatCompletionsInput, "model"> & {
  model: string;
};

export interface CreditCheckEstimate {
  requestedModels: string[];
  estimatedPromptTokens: number;
  maxOutputTokens: number;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  platformFee: number;
  platformMarkupPercent: number;
  totalEstimatedCost: number;
  isFreeModel: boolean;
  modelEstimates?: Record<
    string,
    {
      estimatedPromptTokens: number;
      maxOutputTokens: number;
      estimatedInputCost: number;
      estimatedOutputCost: number;
      platformFee: number;
      platformMarkupPercent: number;
      totalEstimatedCost: number;
      isFreeModel: boolean;
    }
  >;
}

export interface ApiKeyRequestContext {
  apiKey: {
    id: string;
    name?: string | null;
  };
  project: {
    id: string;
    name?: string | null;
    planTier: PlanTier;
  };
  user: {
    id: string;
    email?: string;
  };
  creditCheck: CreditCheckEstimate;
  /** Original model value the caller sent (e.g. "auto") before routing.middleware.ts resolved it to a real slug. */
  requestedModelSlug?: string;
  /** Why routing.middleware.ts resolved the model the way it did. Persisted on InferenceRequest for observability. */
  routingReason?: string;
  /** Set only on the "auto" path — complexity-router.ts's resolved tier and raw score, persisted on InferenceRequest. */
  complexityTier?: ComplexityTier;
  complexityScore?: number;
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
  providerId: string;
  providerModelId?: string | null;
  isFreeModel: boolean;
  inputPricePerToken: number;
  outputPricePerToken: number;
  outputPricingUnit: "TOKEN" | "IMAGE";
  imageOutputPrice: number;
  cacheWritePricePerToken: number;
  cacheReadPricePerToken: number;
  provider: {
    slug: string;
    isActive: boolean;
  };
}

export interface ExecuteCompletionInput {
  body: SingleModelChatCompletionsInput;
  context: ApiKeyRequestContext;
}

export interface ExecuteStreamOptions {
  isClientConnected: () => boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | ProviderContentPart[] | null;
    tool_calls?: ProviderToolCall[];
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
      tool_calls?: ProviderToolCallDelta[];
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
  inferenceRequestId: string;
  billing: BillingResult;
  providerResponse: ProviderChatResponse;
  response: OpenAICompatibleChatCompletionResponse;
}

export type MultiModelExecutionStatus = "success" | "failed" | "timeout";

export interface MultiModelChatCompletionError {
  code: string;
  message: string;
  statusCode?: number;
}

export interface MultiModelChatCompletionResult {
  model: string;
  status: MultiModelExecutionStatus;
  attempts: number;
  inferenceRequestId?: string;
  latencyMs?: number;
  response?: OpenAICompatibleChatCompletionResponse;
  content?: string | ProviderContentPart[] | null;
  usage?: OpenAICompatibleChatCompletionResponse["usage"];
  finish_reason?: string | null;
  billing?: BillingResult;
  error?: MultiModelChatCompletionError;
}

export interface MultiModelChatCompletionResponse {
  id: string;
  object: "chat.completion.group";
  created: number;
  results: MultiModelChatCompletionResult[];
  summary: {
    totalModels: number;
    successfulModels: number;
    failedModels: number;
    timedOutModels: number;
    usage: OpenAICompatibleChatCompletionResponse["usage"];
    billing: BillingResult;
  };
}

export interface StreamAccumulator {
  requestId: string;
  model: string;
  usage?: ProviderUsage;
  finishReason?: string;
  content?: string;
  toolCalls?: Record<number, ProviderToolCall>;
}

export type UnifiedChatMessages = ProviderChatMessage[];
export type UnifiedChatRequest = ProviderChatRequest;
export type UnifiedToolChoice = ProviderToolChoice;
export type UnifiedTools = ProviderTool[];
