import type { ProviderAdapter } from "../base/provider.interface.js";
import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
  ProviderHealthCheckResult,
  ProviderName,
  ProviderStreamEvent,
} from "../base/provider.types.js";
import { GroqClient } from "./groq.client.js";

export class GroqAdapter implements ProviderAdapter {
  readonly providerName: ProviderName;

  constructor(private readonly client: GroqClient) {
    this.providerName = "GROQ";
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
