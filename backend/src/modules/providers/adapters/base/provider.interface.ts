import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderEmbeddingRequest,
  ProviderEmbeddingResponse,
  ProviderHealthCheckResult,
  ProviderName,
  ProviderStreamEvent,
} from "./provider.types.js";

export interface ProviderAdapter {
  readonly providerName: ProviderName;

  chatCompletion(request: ProviderChatRequest): Promise<ProviderChatResponse>;
  streamCompletion(request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>>;
  embeddings(request: ProviderEmbeddingRequest): Promise<ProviderEmbeddingResponse>;
  healthCheck(): Promise<ProviderHealthCheckResult>;
}
