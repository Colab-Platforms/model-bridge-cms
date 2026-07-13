import type { Readable } from "node:stream";

import { ProviderError, ProviderUnavailableError } from "../base/provider.errors.js";
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
  mapAnthropicResponseToProviderResponse,
  mapProviderChatRequestToAnthropic,
  toProviderUsage,
} from "./anthropic.mapper.js";
import type {
  AnthropicContentBlockStartEvent,
  AnthropicContentBlockDeltaEvent,
  AnthropicMessageStartEvent,
  AnthropicMessageDeltaEvent,
  AnthropicMessagesResponse,
  AnthropicModelListResponse,
  AnthropicStreamEvent,
} from "./anthropic.types.js";

const splitSseFrames = (buffer: string) => buffer.split(/\r?\n\r?\n/);

const buildAnthropicHeaders = (
  apiKey: string,
  extraHeaders?: Record<string, string>
) => ({
  "x-api-key": apiKey,
  "Content-Type": "application/json",
  ...extraHeaders,
});

const extractRequestId = (
  messageStartEvent?: AnthropicMessageStartEvent,
  fallbackProviderName?: string
) =>
  messageStartEvent?.message.id ??
  `${fallbackProviderName?.toLowerCase() ?? "anthropic"}-stream-${Date.now()}`;

const extractModel = (
  requestModel: string,
  messageStartEvent?: AnthropicMessageStartEvent
) => messageStartEvent?.message.model ?? requestModel;

export class AnthropicClient {
  constructor(
    private readonly httpClient: ProviderHttpClient,
    private readonly config: ProviderRuntimeConfig
  ) {
  }

  async chatCompletion(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const startedAt = Date.now();
    const response = await this.httpClient.request<AnthropicMessagesResponse>({
      method: "POST",
      url: "/messages",
      headers: buildAnthropicHeaders(this.config.apiKey, this.config.headers),
      data: mapProviderChatRequestToAnthropic(request),
    });

    console.info("Anthropic response payload", {
      model: request.model,
      response,
    });

    return mapAnthropicResponseToProviderResponse(
      this.config.name,
      request.model,
      response,
      calculateLatencyMs(startedAt)
    );
  }

  async streamCompletion(request: ProviderChatRequest): Promise<AsyncIterable<ProviderStreamEvent>> {
    const responseStream = await this.httpClient.requestRaw<Readable>({
      method: "POST",
      url: "/messages",
      responseType: "stream",
      headers: buildAnthropicHeaders(this.config.apiKey, this.config.headers),
      data: mapProviderChatRequestToAnthropic({
        ...request,
        stream: true,
      }),
    });

    const providerName = this.config.name;
    const requestModel = request.model;

    const iterator = async function* (): AsyncGenerator<ProviderStreamEvent> {
      let buffer = "";
      let emittedStart = false;
      let emittedEnd = false;
      let messageStartEvent: AnthropicMessageStartEvent | undefined;
      let latestOutputTokens = 0;
      let latestCacheCreationInputTokens = 0;
      let latestCacheReadInputTokens = 0;
      const toolCallIndexes = new Map<number, { id: string; name: string }>();

      const buildLatestUsage = (inputTokens?: number) =>
        toProviderUsage({
          input_tokens: inputTokens ?? messageStartEvent?.message.usage?.input_tokens ?? 0,
          output_tokens: latestOutputTokens,
          cache_creation_input_tokens:
            latestCacheCreationInputTokens ||
            messageStartEvent?.message.usage?.cache_creation_input_tokens ||
            0,
          cache_read_input_tokens:
            latestCacheReadInputTokens ||
            messageStartEvent?.message.usage?.cache_read_input_tokens ||
            0,
        });

      const parseFrame = async function* (frame: string): AsyncGenerator<ProviderStreamEvent> {
        const lines = frame
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"));

        for (const line of lines) {
          const rawData = line.replace(/^data:\s*/, "");

          if (!rawData) {
            continue;
          }

          const event = JSON.parse(rawData) as AnthropicStreamEvent;

          if (
            event.type === "message_start" ||
            event.type === "message_delta" ||
            event.type === "message_stop" ||
            event.type === "error"
          ) {
            console.info("Anthropic stream event", {
              model: requestModel,
              type: event.type,
              event,
            });
          }

          if (event.type === "ping") {
            continue;
          }

          if (event.type === "error") {
            throw new ProviderError(
              providerName,
              event.error?.message ?? "Anthropic streaming request failed",
              {
                retryable: false,
                details: event,
              }
            );
          }

          if (event.type === "message_start") {
            messageStartEvent = event;
            latestCacheCreationInputTokens =
              event.message.usage?.cache_creation_input_tokens ?? 0;
            latestCacheReadInputTokens =
              event.message.usage?.cache_read_input_tokens ?? 0;

            if (!emittedStart) {
              emittedStart = true;
              yield {
                type: "start",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                rawChunk: event,
              };
            }

            continue;
          }

          if (event.type === "content_block_start") {
            const typedEvent = event as AnthropicContentBlockStartEvent;
            const text = typedEvent.content_block?.type === "text" ? typedEvent.content_block.text : "";

            if (text) {
              yield {
                type: "content",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                delta: text,
                usage: buildLatestUsage(),
                rawChunk: event,
              };
            }

            if (typedEvent.content_block?.type === "tool_use") {
              toolCallIndexes.set(typedEvent.index, {
                id: typedEvent.content_block.id,
                name: typedEvent.content_block.name,
              });

              yield {
                type: "tool_call",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                toolCallDeltas: [
                  {
                    index: typedEvent.index,
                    id: typedEvent.content_block.id,
                    type: "function",
                    function: {
                      name: typedEvent.content_block.name,
                    },
                  },
                ],
                usage: buildLatestUsage(),
                rawChunk: event,
              };
            }

            continue;
          }

          if (event.type === "content_block_delta") {
            const typedEvent = event as AnthropicContentBlockDeltaEvent;
            const text = typedEvent.delta?.type === "text_delta" ? typedEvent.delta.text ?? "" : "";
            const partialJson =
              typedEvent.delta?.type === "input_json_delta" ? typedEvent.delta.partial_json ?? "" : "";

            if (text) {
              yield {
                type: "content",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                delta: text,
                usage: buildLatestUsage(),
                rawChunk: event,
              };
            }

            if (partialJson) {
              const toolCall = toolCallIndexes.get(typedEvent.index);

              yield {
                type: "tool_call",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                toolCallDeltas: [
                  {
                    index: typedEvent.index,
                    ...(toolCall ? { id: toolCall.id, type: "function" } : {}),
                    function: {
                      ...(toolCall ? { name: toolCall.name } : {}),
                      arguments: partialJson,
                    },
                  },
                ],
                usage: buildLatestUsage(),
                rawChunk: event,
              };
            }

            continue;
          }

          if (event.type === "message_delta") {
            latestOutputTokens =
              event.usage?.output_tokens ?? latestOutputTokens;
            latestCacheCreationInputTokens =
              event.usage?.cache_creation_input_tokens ?? latestCacheCreationInputTokens;
            latestCacheReadInputTokens =
              event.usage?.cache_read_input_tokens ?? latestCacheReadInputTokens;

            const typedEvent = event as AnthropicMessageDeltaEvent;

            if (typedEvent.delta?.stop_reason && !emittedEnd) {
              emittedEnd = true;
              yield {
                type: "end",
                requestId: extractRequestId(messageStartEvent, providerName),
                provider: providerName,
                model: extractModel(requestModel, messageStartEvent),
                finishReason: typedEvent.delta.stop_reason ?? undefined,
                usage: buildLatestUsage(),
                rawChunk: event,
              };
            }

            continue;
          }

          if (event.type === "message_stop" && !emittedEnd) {
            emittedEnd = true;
            yield {
              type: "end",
              requestId: extractRequestId(messageStartEvent, providerName),
              provider: providerName,
              model: extractModel(requestModel, messageStartEvent),
              usage: buildLatestUsage(),
              rawChunk: event,
            };
          }
        }
      };

      try {
        for await (const chunk of responseStream) {
          buffer += chunk.toString();

          const frames = splitSseFrames(buffer);
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            yield* parseFrame(frame);
          }
        }

        if (buffer.trim()) {
          const frames = splitSseFrames(`${buffer}\n\n`);

          for (const frame of frames) {
            yield* parseFrame(frame);
          }
        }

        if (!emittedEnd) {
          emittedEnd = true;
          yield {
            type: "end",
            requestId: extractRequestId(messageStartEvent, providerName),
            provider: providerName,
            model: extractModel(requestModel, messageStartEvent),
            usage: toProviderUsage({
              input_tokens: messageStartEvent?.message.usage?.input_tokens ?? 0,
              output_tokens: latestOutputTokens,
            }),
          };
        }
      } finally {
        responseStream.destroy();
      }
    };

    return iterator();
  }

  async embeddings(_request: ProviderEmbeddingRequest): Promise<ProviderEmbeddingResponse> {
    throw new ProviderUnavailableError(
      this.config.name,
      "Anthropic embeddings are not supported by this adapter"
    );
  }

  async healthCheck(): Promise<ProviderHealthCheckResult> {
    const startedAt = Date.now();
    const response = await this.httpClient.request<AnthropicModelListResponse>({
      method: "GET",
      url: "/models",
      headers: buildAnthropicHeaders(this.config.apiKey, this.config.headers),
    });

    return {
      provider: this.config.name,
      isHealthy: Array.isArray(response.data),
      latencyMs: calculateLatencyMs(startedAt),
      message: "Anthropic health check completed",
      rawResponse: response,
    };
  }
}
