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

export class GeminiClient {
  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly config: ProviderRuntimeConfig
  ) {
    void this.httpClient;
  }

  async chatCompletion(_request: ProviderChatRequest): Promise<ProviderChatResponse> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Gemini chat completion endpoint mapping"
    );
  }

  async streamCompletion(_request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Gemini streaming endpoint handling"
    );
  }

  async embeddings(_request: ProviderEmbeddingRequest): Promise<ProviderEmbeddingResponse> {
    throw new ProviderUnavailableError(
      this.config.name,
      "TODO: implement Gemini embeddings endpoint mapping"
    );
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    return {
      provider: this.config.name,
      isHealthy: true,
      latencyMs: 0,
      message: "Gemini adapter registered. TODO: wire a real health endpoint.",
    };
  }
}
