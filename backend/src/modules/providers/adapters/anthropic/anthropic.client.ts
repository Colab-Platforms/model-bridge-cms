import { ProviderUnavailableError } from "../base/provider.errors.js";
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderEmbeddingRequest,
  ProviderEmbeddingResponse,
  ProviderHealthCheckResult,
  ProviderRuntimeConfig,
  ProviderStreamEvent,
} from "../base/provider.types.js";
import { ProviderHttpClient } from "../../shared/provider-http-client.js";

export class AnthropicClient {
  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly config: ProviderRuntimeConfig
  ) {
    void this.httpClient;
  }

  async chatCompletion(_request: ProviderChatRequest): Promise<ProviderChatResponse> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Anthropic chat completion endpoint mapping"
    );
  }

  async streamCompletion(_request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Anthropic streaming endpoint handling"
    );
  }

  async embeddings(_request: ProviderEmbeddingRequest): Promise<ProviderEmbeddingResponse> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Anthropic embeddings when the provider contract is finalized"
    );
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    return {
      provider: this.config.name,
      isHealthy: true,
      latencyMs: 0,
      message: "Anthropic adapter registered. TODO: wire a real health endpoint.",
    };
  }
}
