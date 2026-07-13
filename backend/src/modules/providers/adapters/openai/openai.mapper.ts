import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderContentPart,
  ProviderEmbeddingRequest,
  ProviderEmbeddingResponse,
} from "../base/provider.types.js";
import type {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIEmbeddingRequest,
  OpenAIEmbeddingResponse,
} from "./openai.types.js";

const mapProviderContentToOpenAI = (content: string | ProviderContentPart[] | null) => content;

export const mapProviderChatRequestToOpenAI = (
  request: ProviderChatRequest
): OpenAIChatCompletionRequest => ({
  model: request.model,
  messages: request.messages.map((message) => ({
    role: message.role,
    content: mapProviderContentToOpenAI(message.content),
    ...(message.name ? { name: message.name } : {}),
    ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
    ...(message.toolCalls ? { tool_calls: message.toolCalls } : {}),
  })),
  ...(request.modalities?.length ? { modalities: request.modalities } : {}),
  ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
  ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
  ...(request.stream ? { stream: true, stream_options: { include_usage: true } } : {}),
  ...(request.tools?.length ? { tools: request.tools } : {}),
  ...(request.toolChoice !== undefined ? { tool_choice: request.toolChoice } : {}),
});

const toProviderUsage = (usage?: OpenAIChatCompletionResponse["usage"]) => ({
  promptTokens: usage?.prompt_tokens ?? 0,
  completionTokens: usage?.completion_tokens ?? 0,
  totalTokens: usage?.total_tokens ?? 0,
  cachedPromptTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
});

export const mapOpenAIChatResponseToProviderResponse = (
  providerName: string,
  response: OpenAIChatCompletionResponse,
  latencyMs: number
): ProviderChatResponse => ({
  requestId: response.id,
  provider: providerName,
  model: response.model,
  content: response.choices[0]?.message.content ?? "",
  finishReason: response.choices[0]?.finish_reason ?? undefined,
  toolCalls: response.choices[0]?.message.tool_calls,
  usage: toProviderUsage(response.usage),
  metrics: {
    latencyMs,
    responseCompletionTimeMs: latencyMs,
  },
  rawResponse: response,
});

export const mapProviderEmbeddingRequestToOpenAI = (
  request: ProviderEmbeddingRequest
): OpenAIEmbeddingRequest => ({
  model: request.model,
  input: request.input,
});

export const mapOpenAIEmbeddingResponseToProviderResponse = (
  providerName: string,
  response: OpenAIEmbeddingResponse
): ProviderEmbeddingResponse => ({
  requestId: `${providerName.toLowerCase()}-embedding-${Date.now()}`,
  provider: providerName,
  model: response.model,
  embeddings: response.data.map((item) => item.embedding),
  usage: response.usage
    ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: response.usage.total_tokens,
      }
    : undefined,
  rawResponse: response,
});
