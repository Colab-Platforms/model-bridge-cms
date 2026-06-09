import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderEmbeddingRequest,
  ProviderEmbeddingResponse,
} from "../base/provider.types.js";
import type {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIEmbeddingRequest,
  OpenAIEmbeddingResponse,
} from "./openai.types.js";

export const mapProviderChatRequestToOpenAI = (
  request: ProviderChatRequest
): OpenAIChatCompletionRequest => ({
  model: request.model,
  messages: request.messages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.name ? { name: message.name } : {}),
    ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
  })),
  ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
  ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
  ...(request.stream ? { stream: true, stream_options: { include_usage: true } } : {}),
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
  usage: {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  },
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
