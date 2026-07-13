import { RequestStatus, RequestType } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import prisma from "../../../prisma.js";
import { inferenceTrackingService } from "../../services/inference-tracking.service.js";
import { createProviderFactory } from "../providers/registry/provider.factory.js";
import type {
  ExecuteCompletionInput,
  ExecuteCompletionResult,
  ExecuteStreamOptions,
  OpenAICompatibleChatCompletionChunk,
  OpenAICompatibleChatCompletionResponse,
  ResolvedModelRecord,
  StreamAccumulator,
  UnifiedChatRequest,
} from "./completions.types.js";
import type {
  ProviderContentPart,
  ProviderChatResponse,
  ProviderToolCall,
  ProviderToolCallDelta,
  ProviderStreamEvent,
} from "../providers/adapters/base/provider.types.js";

const providerFactory = createProviderFactory({
  logger: {
    info: (message, meta) => console.info(message, meta),
    warn: (message, meta) => console.warn(message, meta),
    error: (message, meta) => console.error(message, meta),
  },
});

const AVG_CHARS_PER_TOKEN = 2.5;
const IMAGE_MODALITY = "image";

const resolveModelRecord = async (modelSlug: string): Promise<ResolvedModelRecord> => {
  const modelRecord = await prisma.model.findFirst({
    where: {
      slug: modelSlug,
      isDeleted: false,
      isActive: true,
    },
    select: {
      id: true,
      providerId: true,
      slug: true,
      providerModelId: true,
      isFreeModel: true,
      inputPricePerToken: true,
      outputPricePerToken: true,
      outputPricingUnit: true,
      imageOutputPrice: true,
      cacheWritePricePerToken: true,
      cacheReadPricePerToken: true,
      provider: {
        select: {
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (!modelRecord) {
    throw new AppError("Requested model not found", STATUS_CODES.NOT_FOUND);
  }

  if (!modelRecord.provider.slug || !modelRecord.provider.isActive) {
    throw new AppError("Provider is unavailable for the requested model", STATUS_CODES.BAD_REQUEST);
  }

  return {
    id: modelRecord.id,
    providerId: modelRecord.providerId,
    slug: modelRecord.slug,
    providerModelId: modelRecord.providerModelId,
    isFreeModel: modelRecord.isFreeModel,
    inputPricePerToken: Number(modelRecord.inputPricePerToken ?? 0),
    outputPricePerToken: Number(modelRecord.outputPricePerToken ?? 0),
    outputPricingUnit: modelRecord.outputPricingUnit,
    imageOutputPrice: Number(modelRecord.imageOutputPrice ?? 0),
    cacheWritePricePerToken: Number(modelRecord.cacheWritePricePerToken ?? 0),
    cacheReadPricePerToken: Number(modelRecord.cacheReadPricePerToken ?? 0),
    provider: {
      slug: modelRecord.provider.slug,
      isActive: modelRecord.provider.isActive,
    },
  };
};

const buildProviderRequest = (
  input: ExecuteCompletionInput,
  modelRecord: ResolvedModelRecord
): UnifiedChatRequest => ({
  // Keep frontend/API requests slug-based, but send the provider-native model ID upstream.
  model: modelRecord.providerModelId ?? modelRecord.slug,
  messages: input.body.messages,
  ...(input.body.cache_control !== undefined ? { cacheControl: input.body.cache_control } : {}),
  ...(input.body.modalities !== undefined ? { modalities: input.body.modalities } : {}),
  ...(input.body.temperature !== undefined ? { temperature: input.body.temperature } : {}),
  ...(input.body.max_tokens !== undefined ? { maxTokens: input.body.max_tokens } : {}),
  ...(input.body.stream !== undefined ? { stream: input.body.stream } : {}),
  ...(input.body.tools !== undefined ? { tools: input.body.tools } : {}),
  ...(input.body.tool_choice !== undefined ? { toolChoice: input.body.tool_choice } : {}),
});

const hasImageOutputModality = (modalities?: string[]) =>
  modalities?.some((modality) => modality.trim().toLowerCase() === IMAGE_MODALITY) ?? false;

const serializeContentPartForStreaming = (part: ProviderContentPart) => {
  if (part.type === "text") {
    return part.text;
  }

  return `![generated image](${part.image_url.url})`;
};

const serializeProviderContentForStreaming = (
  content: ProviderChatResponse["content"]
) => {
  if (content === null) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content.map(serializeContentPartForStreaming).filter(Boolean).join("\n");
};

const normalizeFinishReason = (finishReason?: string | null) => {
  if (finishReason === "tool_use") {
    return "tool_calls";
  }

  return finishReason ?? null;
};

const mapToolCallsForResponse = (toolCalls?: ProviderToolCall[]) =>
  toolCalls && toolCalls.length > 0 ? toolCalls : undefined;

const mapToOpenAICompatibleResponse = (
  model: string,
  providerResponse: ExecuteCompletionResult["providerResponse"]
): OpenAICompatibleChatCompletionResponse => ({
  id: providerResponse.requestId,
  object: "chat.completion",
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content:
          providerResponse.toolCalls?.length && !providerResponse.content
            ? null
            : providerResponse.content,
        ...(mapToolCallsForResponse(providerResponse.toolCalls)
          ? { tool_calls: providerResponse.toolCalls }
          : {}),
      },
      finish_reason: normalizeFinishReason(providerResponse.finishReason),
    },
  ],
  usage: {
    prompt_tokens: providerResponse.usage.promptTokens,
    completion_tokens: providerResponse.usage.completionTokens,
    total_tokens: providerResponse.usage.totalTokens,
  },
});

const toSseMessage = (payload: OpenAICompatibleChatCompletionChunk | "[DONE]" | { error: { message: string } }) =>
  `data: ${payload === "[DONE]" ? payload : JSON.stringify(payload)}\n\n`;

const mapUsageToOpenAIUsage = (usage?: StreamAccumulator["usage"]) =>
  usage
    ? {
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
      }
    : undefined;

const buildOpenAIStartChunk = (
  requestId: string,
  model: string
): OpenAICompatibleChatCompletionChunk => ({
  id: requestId,
  object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      delta: {
        role: "assistant",
      },
      finish_reason: null,
    },
  ],
});

const buildOpenAIContentChunk = (
  requestId: string,
  model: string,
  content: string
): OpenAICompatibleChatCompletionChunk => ({
  id: requestId,
  object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      delta: {
        content,
      },
      finish_reason: null,
    },
  ],
});

const buildOpenAIFinalChunk = (
  requestId: string,
  model: string,
  finishReason: string | undefined,
  accumulator: StreamAccumulator
): OpenAICompatibleChatCompletionChunk => ({
  id: requestId,
  object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      delta: {},
      finish_reason: finishReason ?? "stop",
    },
  ],
  ...(accumulator.usage ? { usage: mapUsageToOpenAIUsage(accumulator.usage) } : {}),
});

const estimateTokensFromText = (text: string) =>
  text.trim().length > 0 ? Math.ceil(text.length / AVG_CHARS_PER_TOKEN) : 0;

const resolveStreamUsage = (
  accumulator: StreamAccumulator,
  estimatedPromptTokens: number
) => {
  const estimatedCompletionTokens = estimateTokensFromText(accumulator.content ?? "");
  const promptTokens = accumulator.usage?.promptTokens ?? estimatedPromptTokens;
  const completionTokens =
    accumulator.usage?.completionTokens && accumulator.usage.completionTokens > 0
      ? accumulator.usage.completionTokens
      : estimatedCompletionTokens;
  const totalTokens =
    accumulator.usage?.totalTokens && accumulator.usage.totalTokens > 0
      ? accumulator.usage.totalTokens
      : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    ...(accumulator.usage?.cachedPromptTokens !== undefined
      ? { cachedPromptTokens: accumulator.usage.cachedPromptTokens }
      : {}),
    ...(accumulator.usage?.cacheCreationInputTokens !== undefined
      ? { cacheCreationInputTokens: accumulator.usage.cacheCreationInputTokens }
      : {}),
    ...(accumulator.usage?.cacheReadInputTokens !== undefined
      ? { cacheReadInputTokens: accumulator.usage.cacheReadInputTokens }
      : {}),
  };
};

const hasMeaningfulToolCalls = (toolCalls?: Record<number, ProviderToolCall>) =>
  Boolean(toolCalls && Object.values(toolCalls).some((toolCall) => toolCall.function.name));

const hasMeaningfulStreamOutput = (accumulator: StreamAccumulator) =>
  Boolean(accumulator.content?.trim()) ||
  (accumulator.usage?.completionTokens ?? 0) > 0 ||
  hasMeaningfulToolCalls(accumulator.toolCalls);

const applyToolCallDeltas = (
  accumulator: StreamAccumulator,
  deltas: ProviderToolCallDelta[]
) => {
  if (!accumulator.toolCalls) {
    accumulator.toolCalls = {};
  }

  for (const delta of deltas) {
    const existing = accumulator.toolCalls[delta.index] ?? {
      id: delta.id ?? `tool-call-${delta.index}`,
      type: "function" as const,
      function: {
        name: "",
        arguments: "",
      },
    };

    if (delta.id) {
      existing.id = delta.id;
    }

    existing.type = "function";

    if (delta.function?.name) {
      existing.function.name = delta.function.name;
    }

    if (delta.function?.arguments) {
      existing.function.arguments = `${existing.function.arguments}${delta.function.arguments}`;
    }

    accumulator.toolCalls[delta.index] = existing;
  }
};

export class CompletionsService {
  async executeDetailed(input: ExecuteCompletionInput): Promise<ExecuteCompletionResult> {
    const modelRecord = await resolveModelRecord(input.body.model);
    const providerRequest = buildProviderRequest(input, modelRecord);

    const inferenceRequest = await inferenceTrackingService.createPendingRequest({
      userId: input.context.user.id,
      projectId: input.context.project.id,
      apiKeyId: input.context.apiKey.id,
      modelId: modelRecord.id,
      requestedModelSlug: input.body.model,
      resolvedModelSlug: modelRecord.slug,
      stream: input.body.stream ?? false,
      requestType: "CHAT",
    });

    let providerResponse: ProviderChatResponse;

    try {
      const adapter = providerFactory.get(modelRecord.provider.slug);
      providerResponse = await adapter.chatCompletion(providerRequest);
    } catch (error) {
      await inferenceTrackingService.handleProviderFailure(inferenceRequest.id);
      throw error;
    }

    const completionResult = await inferenceTrackingService.completeRequest({
      inferenceRequestId: inferenceRequest.id,
      userId: input.context.user.id,
      providerId: modelRecord.providerId,
      promptTokens: providerResponse.usage.promptTokens,
      completionTokens: providerResponse.usage.completionTokens,
      totalTokens: providerResponse.usage.totalTokens,
      cachedPromptTokens: providerResponse.usage.cachedPromptTokens,
      cacheCreationInputTokens: providerResponse.usage.cacheCreationInputTokens,
      cacheReadInputTokens: providerResponse.usage.cacheReadInputTokens,
      latencyMs: providerResponse.metrics.latencyMs,
      responseCompletionTimeMs: providerResponse.metrics.responseCompletionTimeMs,
      isFreeModel: modelRecord.isFreeModel,
      inputPricePerToken: modelRecord.inputPricePerToken,
      outputPricePerToken: modelRecord.outputPricePerToken,
      outputPricingUnit: modelRecord.outputPricingUnit,
      imageOutputPrice: modelRecord.imageOutputPrice,
      cacheWritePricePerToken: modelRecord.cacheWritePricePerToken,
      cacheReadPricePerToken: modelRecord.cacheReadPricePerToken,
      platformMarkupPercent: input.context.creditCheck.platformMarkupPercent,
      walletReferenceId: inferenceRequest.id,
      walletDeductionDescription: "AI Model Usage",
    });

    return {
      inferenceRequestId: inferenceRequest.id,
      billing: completionResult.billing,
      providerResponse,
      response: mapToOpenAICompatibleResponse(input.body.model, providerResponse),
    };
  }

  async execute(input: ExecuteCompletionInput): Promise<OpenAICompatibleChatCompletionResponse> {
    const result = await this.executeDetailed(input);
    return result.response;
  }

  async executeStream(
    input: ExecuteCompletionInput,
    options: ExecuteStreamOptions
  ): Promise<AsyncIterable<string>> {
    const modelRecord = await resolveModelRecord(input.body.model);
    const startedAt = Date.now();
    const shouldUseSyntheticImageStream = hasImageOutputModality(input.body.modalities);
    const providerRequest = buildProviderRequest({
      ...input,
      body: {
        ...input.body,
        stream: shouldUseSyntheticImageStream ? false : true,
      },
    }, modelRecord);

    const inferenceRequest = await inferenceTrackingService.createPendingRequest({
      userId: input.context.user.id,
      projectId: input.context.project.id,
      apiKeyId: input.context.apiKey.id,
      modelId: modelRecord.id,
      requestedModelSlug: input.body.model,
      resolvedModelSlug: modelRecord.slug,
      stream: true,
      requestType: RequestType.STREAM,
    });

    if (shouldUseSyntheticImageStream) {
      let providerResponse: ProviderChatResponse;

      try {
        const adapter = providerFactory.get(modelRecord.provider.slug);
        providerResponse = await adapter.chatCompletion(providerRequest);
      } catch (error) {
        await inferenceTrackingService.handleProviderFailure(inferenceRequest.id, RequestStatus.FAILED);
        throw error;
      }

      const iterator = async function* (): AsyncGenerator<string> {
        const serializedContent = serializeProviderContentForStreaming(providerResponse.content);

        try {
          if (!options.isClientConnected()) {
            await inferenceTrackingService.handleProviderFailure(
              inferenceRequest.id,
              RequestStatus.STOPPED
            );
            return;
          }

          await inferenceTrackingService.completeRequest({
            inferenceRequestId: inferenceRequest.id,
            userId: input.context.user.id,
            providerId: modelRecord.providerId,
            promptTokens: providerResponse.usage.promptTokens,
            completionTokens: providerResponse.usage.completionTokens,
            totalTokens: providerResponse.usage.totalTokens,
            cachedPromptTokens: providerResponse.usage.cachedPromptTokens,
            cacheCreationInputTokens: providerResponse.usage.cacheCreationInputTokens,
            cacheReadInputTokens: providerResponse.usage.cacheReadInputTokens,
            latencyMs: providerResponse.metrics.latencyMs,
            responseCompletionTimeMs: providerResponse.metrics.responseCompletionTimeMs,
            isFreeModel: modelRecord.isFreeModel,
            inputPricePerToken: modelRecord.inputPricePerToken,
            outputPricePerToken: modelRecord.outputPricePerToken,
            outputPricingUnit: modelRecord.outputPricingUnit,
            imageOutputPrice: modelRecord.imageOutputPrice,
            cacheWritePricePerToken: modelRecord.cacheWritePricePerToken,
            cacheReadPricePerToken: modelRecord.cacheReadPricePerToken,
            platformMarkupPercent: input.context.creditCheck.platformMarkupPercent,
            walletReferenceId: inferenceRequest.id,
            walletDeductionDescription: "AI Model Usage",
          });

          yield toSseMessage(buildOpenAIStartChunk(providerResponse.requestId, input.body.model));

          if (serializedContent) {
            yield toSseMessage(
              buildOpenAIContentChunk(
                providerResponse.requestId,
                input.body.model,
                serializedContent
              )
            );
          }

          yield toSseMessage(
            buildOpenAIFinalChunk(providerResponse.requestId, input.body.model, providerResponse.finishReason, {
              requestId: providerResponse.requestId,
              model: input.body.model,
              content: serializedContent,
              usage: providerResponse.usage,
              finishReason: providerResponse.finishReason,
            })
          );
          yield toSseMessage("[DONE]");
        } catch (error) {
          await inferenceTrackingService.handleProviderFailure(inferenceRequest.id, RequestStatus.FAILED);

          if (options.isClientConnected()) {
            yield toSseMessage({
              error: {
                message: error instanceof Error ? error.message : "Streaming request failed",
              },
            });
          }

          throw error;
        }
      };

      return iterator();
    }

    let providerStream: AsyncIterable<ProviderStreamEvent>;

    try {
      const adapter = providerFactory.get(modelRecord.provider.slug);
      providerStream = await adapter.streamCompletion(providerRequest);
    } catch (error) {
      await inferenceTrackingService.handleProviderFailure(inferenceRequest.id, RequestStatus.FAILED);
      throw error;
    }

    const iterator = async function* (): AsyncGenerator<string> {
      const accumulator: StreamAccumulator = {
        requestId: inferenceRequest.id,
        model: input.body.model,
        content: "",
        toolCalls: {},
      };
      let streamStarted = false;
      let settled = false;
      let providerFailed = false;
      let firstChunkAt: number | null = null;

      try {
        for await (const event of providerStream) {
          if (!options.isClientConnected()) {
            return;
          }

          accumulator.requestId = event.requestId;
          accumulator.model = event.model;

          if (event.usage) {
            accumulator.usage = event.usage;
          }

          if (event.type === "start") {
            if (!streamStarted) {
              streamStarted = true;
              firstChunkAt = firstChunkAt ?? Date.now();
              yield toSseMessage(buildOpenAIStartChunk(accumulator.requestId, input.body.model));
            }
            continue;
          }

          if (event.type === "content") {
            if (!streamStarted) {
              streamStarted = true;
              firstChunkAt = firstChunkAt ?? Date.now();
              yield toSseMessage(buildOpenAIStartChunk(accumulator.requestId, input.body.model));
            }

            if (event.delta) {
              accumulator.content = `${accumulator.content ?? ""}${event.delta}`;
              yield toSseMessage(
                buildOpenAIContentChunk(accumulator.requestId, input.body.model, event.delta)
              );
            }

            continue;
          }

          if (event.type === "tool_call") {
            if (!streamStarted) {
              streamStarted = true;
              firstChunkAt = firstChunkAt ?? Date.now();
              yield toSseMessage(buildOpenAIStartChunk(accumulator.requestId, input.body.model));
            }

            applyToolCallDeltas(accumulator, event.toolCallDeltas);
            yield toSseMessage({
              id: accumulator.requestId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: input.body.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: event.toolCallDeltas,
                  },
                  finish_reason: null,
                },
              ],
              ...(accumulator.usage ? { usage: mapUsageToOpenAIUsage(accumulator.usage) } : {}),
            });
            continue;
          }

          if (event.type === "end") {
            accumulator.finishReason = event.finishReason;
          }
        }

        if (!options.isClientConnected()) {
          await inferenceTrackingService.handleProviderFailure(inferenceRequest.id, RequestStatus.STOPPED);
          settled = true;
          return;
        }

        accumulator.usage = resolveStreamUsage(
          accumulator,
          input.context.creditCheck.estimatedPromptTokens
        );

        if (!hasMeaningfulStreamOutput(accumulator)) {
          throw new AppError(
            "Provider returned an empty streaming response",
            STATUS_CODES.SERVER_ERROR
          );
        }

        const completedAt = Date.now();
        const latencyMs = firstChunkAt ? firstChunkAt - startedAt : completedAt - startedAt;
        const responseCompletionTimeMs = completedAt - startedAt;

        await inferenceTrackingService.completeRequest({
          inferenceRequestId: inferenceRequest.id,
          userId: input.context.user.id,
          providerId: modelRecord.providerId,
          promptTokens: accumulator.usage.promptTokens,
          completionTokens: accumulator.usage.completionTokens,
          totalTokens: accumulator.usage.totalTokens,
          cachedPromptTokens: accumulator.usage.cachedPromptTokens,
          cacheCreationInputTokens: accumulator.usage.cacheCreationInputTokens,
          cacheReadInputTokens: accumulator.usage.cacheReadInputTokens,
          latencyMs,
          responseCompletionTimeMs,
          isFreeModel: modelRecord.isFreeModel,
          inputPricePerToken: modelRecord.inputPricePerToken,
          outputPricePerToken: modelRecord.outputPricePerToken,
          outputPricingUnit: modelRecord.outputPricingUnit,
          imageOutputPrice: modelRecord.imageOutputPrice,
          cacheWritePricePerToken: modelRecord.cacheWritePricePerToken,
          cacheReadPricePerToken: modelRecord.cacheReadPricePerToken,
          platformMarkupPercent: input.context.creditCheck.platformMarkupPercent,
          walletReferenceId: inferenceRequest.id,
          walletDeductionDescription: "AI Model Usage",
        });
        settled = true;

        yield toSseMessage(
          buildOpenAIFinalChunk(
            accumulator.requestId,
            input.body.model,
            normalizeFinishReason(accumulator.finishReason) ?? undefined,
            accumulator
          )
        );
        yield toSseMessage("[DONE]");
      } catch (error) {
        providerFailed = true;
        await inferenceTrackingService.handleProviderFailure(inferenceRequest.id, RequestStatus.FAILED);

        if (options.isClientConnected()) {
          yield toSseMessage({
            error: {
              message: error instanceof Error ? error.message : "Streaming request failed",
            },
          });
        }

        throw error;
      } finally {
        if (!settled && !providerFailed && !options.isClientConnected()) {
          await inferenceTrackingService.handleProviderFailure(
            inferenceRequest.id,
            RequestStatus.STOPPED
          );
        }
      }
    };

    return iterator();
  }
}

export const completionsService = new CompletionsService();
