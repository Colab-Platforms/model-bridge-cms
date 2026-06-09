import type { ProviderAdapter } from "../base/provider.interface.js";
import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
  ProviderHealthCheckResult,
  ProviderName,
  ProviderStreamEvent,
} from "../base/provider.types.js";
import { AnthropicClient } from "./anthropic.client.js";

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName: ProviderName;

  constructor(private readonly client: AnthropicClient) {
    this.providerName = "ANTHROPIC";
  }

  async chatCompletion(request: ProviderChatRequest) {
    return this.client.chatCompletion(request);
  }

  async streamCompletion(request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    return this.client.streamCompletion(request);
  }

  async embeddings(request: ProviderEmbeddingRequest) {
    return this.client.embeddings(request);
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    return this.client.healthCheck();
  }
}
