import type { Readable } from "node:stream";

import { ProviderHttpClient } from "../../shared/provider-http-client.js";
import { buildBearerAuthHeaders, calculateLatencyMs } from "../../shared/provider-utils.js";
import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
  ProviderHealthCheckResult,
  ProviderRuntimeConfig,
  ProviderStreamEvent,
} from "../base/provider.types.js";
import {
  mapOpenAIChatResponseToProviderResponse,
  mapOpenAIEmbeddingResponseToProviderResponse,
  mapProviderChatRequestToOpenAI,
  mapProviderEmbeddingRequestToOpenAI,
} from "./openai.mapper.js";
import type {
  OpenAIChatCompletionResponse,
  OpenAIEmbeddingResponse,
  OpenAIModelListResponse,
  OpenAIStreamChatCompletionChunk,
} from "./openai.types.js";

const splitSseFrames = (buffer: string) => buffer.split(/\r?\n\r?\n/);

const hasNonTextModality = (modalities?: string[]) =>
  (modalities ?? []).some((modality) => modality.trim().toLowerCase() !== "text");

export class OpenAIClient {
  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly config: ProviderRuntimeConfig
  ) {}

  private sanitizeForProvider(request: ProviderChatRequest): ProviderChatRequest {
    if (this.config.name !== "OPENAI" || hasNonTextModality(request.modalities)) {
      return request;
    }

    const { modalities: _modalities, ...rest } = request;
    return rest;
  }

  async chatCompletion(request: ProviderChatRequest) {
    const startedAt = Date.now();
    const response = await this.httpClient.request<OpenAIChatCompletionResponse>({
      method: "POST",
      url: "/chat/completions",
      headers: buildBearerAuthHeaders(this.config.apiKey, this.config.headers),
      data: mapProviderChatRequestToOpenAI(this.sanitizeForProvider(request)),
    });

    return mapOpenAIChatResponseToProviderResponse(
      this.config.name,
      response,
      calculateLatencyMs(startedAt)
    );
  }

  async streamCompletion(request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    const responseStream = await this.httpClient.requestRaw<Readable>({
      method: "POST",
      url: "/chat/completions",
      responseType: "stream",
      headers: buildBearerAuthHeaders(this.config.apiKey, this.config.headers),
      data: mapProviderChatRequestToOpenAI({
        ...this.sanitizeForProvider(request),
        stream: true,
      }),
    });

    const providerName = this.config.name;
    const model = request.model;

    const iterator = async function* (): AsyncGenerator<ProviderStreamEvent> {
      let buffer = "";
      let emittedStart = false;
      let emittedEnd = false;
      let streamRequestId = `${providerName.toLowerCase()}-stream-${Date.now()}`;
      let streamModel = model;
      let latestUsage:
        | {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            cachedPromptTokens?: number;
          }
        | undefined;

      try {
        for await (const chunk of responseStream) {
          buffer += chunk.toString();

          const frames = splitSseFrames(buffer);
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const lines = frame
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
              const rawData = line.replace(/^data:\s*/, "");

              if (rawData === "[DONE]") {
                if (!emittedEnd) {
                  emittedEnd = true;
                  yield {
                    type: "end",
                    requestId: streamRequestId,
                    provider: providerName,
                    model: streamModel,
                    usage: latestUsage,
                  };
                }
                continue;
              }

              const parsedChunk = JSON.parse(rawData) as OpenAIStreamChatCompletionChunk;
              streamRequestId = parsedChunk.id;
              streamModel = parsedChunk.model;

              if (parsedChunk.usage) {
                latestUsage = {
                  promptTokens: parsedChunk.usage.prompt_tokens,
                  completionTokens: parsedChunk.usage.completion_tokens,
                  totalTokens: parsedChunk.usage.total_tokens,
                  cachedPromptTokens: parsedChunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
                };
              }

              if (!emittedStart) {
                emittedStart = true;
                yield {
                  type: "start",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  rawChunk: parsedChunk,
                };
              }

              const choice = parsedChunk.choices[0];
              const delta = choice?.delta.content;
              const toolCalls = choice?.delta.tool_calls;

              if (delta) {
                yield {
                  type: "content",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  delta,
                  finishReason: choice.finish_reason ?? undefined,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }

              if (toolCalls?.length) {
                yield {
                  type: "tool_call",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  toolCallDeltas: toolCalls,
                  finishReason: choice.finish_reason ?? undefined,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }

              if (choice?.finish_reason && !emittedEnd) {
                emittedEnd = true;
                yield {
                  type: "end",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  finishReason: choice.finish_reason,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }
            }
          }
        }

        if (buffer.trim()) {
          const frames = splitSseFrames(`${buffer}\n\n`);

          for (const frame of frames) {
            const lines = frame
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
              const rawData = line.replace(/^data:\s*/, "");

              if (rawData === "[DONE]") {
                if (!emittedEnd) {
                  emittedEnd = true;
                  yield {
                    type: "end",
                    requestId: streamRequestId,
                    provider: providerName,
                    model: streamModel,
                    usage: latestUsage,
                  };
                }
                continue;
              }

              const parsedChunk = JSON.parse(rawData) as OpenAIStreamChatCompletionChunk;
              streamRequestId = parsedChunk.id;
              streamModel = parsedChunk.model;

              if (parsedChunk.usage) {
                latestUsage = {
                  promptTokens: parsedChunk.usage.prompt_tokens,
                  completionTokens: parsedChunk.usage.completion_tokens,
                  totalTokens: parsedChunk.usage.total_tokens,
                  cachedPromptTokens: parsedChunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
                };
              }

              if (!emittedStart) {
                emittedStart = true;
                yield {
                  type: "start",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  rawChunk: parsedChunk,
                };
              }

              const choice = parsedChunk.choices[0];
              const delta = choice?.delta.content;
              const toolCalls = choice?.delta.tool_calls;

              if (delta) {
                yield {
                  type: "content",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  delta,
                  finishReason: choice.finish_reason ?? undefined,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }

              if (toolCalls?.length) {
                yield {
                  type: "tool_call",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  toolCallDeltas: toolCalls,
                  finishReason: choice.finish_reason ?? undefined,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }

              if (choice?.finish_reason && !emittedEnd) {
                emittedEnd = true;
                yield {
                  type: "end",
                  requestId: parsedChunk.id,
                  provider: providerName,
                  model: parsedChunk.model,
                  finishReason: choice.finish_reason,
                  usage: latestUsage,
                  rawChunk: parsedChunk,
                };
              }
            }
          }
        }
      } finally {
        responseStream.destroy();
      }
    };

    return iterator();
  }

  async embeddings(request: ProviderEmbeddingRequest) {
    const response = await this.httpClient.request<OpenAIEmbeddingResponse>({
      method: "POST",
      url: "/embeddings",
      headers: buildBearerAuthHeaders(this.config.apiKey, this.config.headers),
      data: mapProviderEmbeddingRequestToOpenAI(request),
    });

    return mapOpenAIEmbeddingResponseToProviderResponse(this.config.name, response);
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    const startedAt = Date.now();
    const response = await this.httpClient.request<OpenAIModelListResponse>({
      method: "GET",
      url: "/models",
      headers: buildBearerAuthHeaders(this.config.apiKey, this.config.headers),
    });

    return {
      provider: this.config.name,
      isHealthy: Array.isArray(response.data),
      latencyMs: calculateLatencyMs(startedAt),
      message: "OpenAI health check completed",
      rawResponse: response,
    };
  }
}
