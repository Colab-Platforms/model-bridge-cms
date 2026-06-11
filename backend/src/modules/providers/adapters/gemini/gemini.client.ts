import type { Readable } from "node:stream";

import { ProviderError } from "../base/provider.errors.js";
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
import { calculateLatencyMs } from "../../shared/provider-utils.js";
import {
  extractGeminiText,
  mapGeminiChatResponseToProviderResponse,
  mapGeminiEmbeddingResponseToProviderResponse,
  mapProviderChatRequestToGemini,
  mapProviderEmbeddingRequestToGemini,
} from "./gemini.mapper.js";
import type {
  GeminiEmbedContentResponse,
  GeminiGenerateContentResponse,
  GeminiModelListResponse,
} from "./gemini.types.js";

const ensureGeminiModelPath = (model: string) =>
  model.startsWith("models/") ? model : `models/${model}`;

const buildGeminiApiKeyParams = (apiKey: string) => ({
  key: apiKey,
});

const extractGeminiUsage = (response: GeminiGenerateContentResponse) => ({
  promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
  completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  totalTokens:
    response.usageMetadata?.totalTokenCount ??
    (response.usageMetadata?.promptTokenCount ?? 0) +
      (response.usageMetadata?.candidatesTokenCount ?? 0),
});

export class GeminiClient {
  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly config: ProviderRuntimeConfig
  ) {
  }

  async chatCompletion(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const startedAt = Date.now();
    const modelPath = ensureGeminiModelPath(request.model);
    const response = await this.httpClient.request<GeminiGenerateContentResponse>({
      method: "POST",
      url: `/${modelPath}:generateContent`,
      params: buildGeminiApiKeyParams(this.config.apiKey),
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      data: mapProviderChatRequestToGemini(request),
    });

    return mapGeminiChatResponseToProviderResponse(
      this.config.name,
      request.model,
      response,
      calculateLatencyMs(startedAt)
    );
  }

  async streamCompletion(request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    const modelPath = ensureGeminiModelPath(request.model);
    const responseStream = await this.httpClient.requestRaw<Readable>({
      method: "POST",
      url: `/${modelPath}:streamGenerateContent`,
      params: {
        ...buildGeminiApiKeyParams(this.config.apiKey),
        alt: "sse",
      },
      responseType: "stream",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      data: mapProviderChatRequestToGemini({
        ...request,
        stream: true,
      }),
    });

    const providerName = this.config.name;
    const fallbackRequestId = `${providerName.toLowerCase()}-stream-${Date.now()}`;
    const fallbackModel = request.model;

    const iterator = async function* (): AsyncGenerator<ProviderStreamEvent> {
      let buffer = "";
      let emittedStart = false;
      let emittedEnd = false;
      let latestUsage:
        | {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          }
        | undefined;

      try {
        for await (const chunk of responseStream) {
          buffer += chunk.toString();

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const lines = frame
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
              const rawData = line.replace(/^data:\s*/, "");

              if (!rawData) {
                continue;
              }

              const parsedChunk = JSON.parse(rawData) as GeminiGenerateContentResponse;
              const contentDelta = extractGeminiText(parsedChunk);
              const candidate = parsedChunk.candidates?.[0];

              latestUsage = extractGeminiUsage(parsedChunk);

              if (!emittedStart) {
                emittedStart = true;
                yield {
                  type: "start",
                  requestId: parsedChunk.responseId ?? fallbackRequestId,
                  provider: providerName,
                  model: parsedChunk.modelVersion ?? fallbackModel,
                  rawChunk: parsedChunk,
                };
              }

              if (contentDelta) {
                yield {
                  type: "content",
                  requestId: parsedChunk.responseId ?? fallbackRequestId,
                  provider: providerName,
                  model: parsedChunk.modelVersion ?? fallbackModel,
                  delta: contentDelta,
                  finishReason: candidate?.finishReason,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }

              if (candidate?.finishReason && !emittedEnd) {
                emittedEnd = true;
                yield {
                  type: "end",
                  requestId: parsedChunk.responseId ?? fallbackRequestId,
                  provider: providerName,
                  model: parsedChunk.modelVersion ?? fallbackModel,
                  finishReason: candidate.finishReason,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }
            }
          }
        }

        if (!emittedEnd) {
          emittedEnd = true;
          yield {
            type: "end",
            requestId: fallbackRequestId,
            provider: providerName,
            model: fallbackModel,
            usage: latestUsage,
          };
        }
      } finally {
        responseStream.destroy();
      }
    };

    return iterator();
  }

  async embeddings(request: ProviderEmbeddingRequest): Promise<ProviderEmbeddingResponse> {
    const modelPath = ensureGeminiModelPath(request.model);
    const payload = mapProviderEmbeddingRequestToGemini(request);

    if (payload.requests.length === 1) {
      const response = await this.httpClient.request<GeminiEmbedContentResponse>({
        method: "POST",
        url: `/${modelPath}:embedContent`,
        params: buildGeminiApiKeyParams(this.config.apiKey),
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        data: payload.requests[0],
      });

      return mapGeminiEmbeddingResponseToProviderResponse(this.config.name, request.model, response);
    }

    throw new ProviderError(
      this.config.name,
      "Gemini batch embeddings are not implemented in this adapter yet",
      {
        retryable: false,
      }
    );
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    const startedAt = Date.now();
    const response = await this.httpClient.request<GeminiModelListResponse>({
      method: "GET",
      url: "/models",
      params: buildGeminiApiKeyParams(this.config.apiKey),
      headers: this.config.headers,
    });

    return {
      provider: this.config.name,
      isHealthy: Array.isArray(response.models),
      latencyMs: calculateLatencyMs(startedAt),
      message: "Gemini health check completed",
      rawResponse: response,
    };
  }
}
