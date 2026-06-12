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
  ProviderChatResponse,
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

const resolveModelRecord = async (modelSlug: string): Promise<ResolvedModelRecord> => {
  const modelRecord = await prisma.model.findFirst({
    where: {
      slug: modelSlug,
      isDeleted: false,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      inputPricePerToken: true,
      outputPricePerToken: true,
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
    slug: modelRecord.slug,
    inputPricePerToken: Number(modelRecord.inputPricePerToken ?? 0),
    outputPricePerToken: Number(modelRecord.outputPricePerToken ?? 0),
    provider: {
      slug: modelRecord.provider.slug,
      isActive: modelRecord.provider.isActive,
    },
  };
};

const buildProviderRequest = (input: ExecuteCompletionInput): UnifiedChatRequest => ({
  model: input.body.model,
  messages: input.body.messages,
  ...(input.body.temperature !== undefined ? { temperature: input.body.temperature } : {}),
  ...(input.body.max_tokens !== undefined ? { maxTokens: input.body.max_tokens } : {}),
  ...(input.body.stream !== undefined ? { stream: input.body.stream } : {}),
});

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
        content: providerResponse.content,
      },
      finish_reason: providerResponse.finishReason ?? null,
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
  };
};

const hasMeaningfulStreamOutput = (accumulator: StreamAccumulator) =>
  Boolean(accumulator.content?.trim()) || (accumulator.usage?.completionTokens ?? 0) > 0;

export class CompletionsService {
  async execute(input: ExecuteCompletionInput): Promise<OpenAICompatibleChatCompletionResponse> {
    const modelRecord = await resolveModelRecord(input.body.model);
    const providerRequest = buildProviderRequest(input);

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

    await inferenceTrackingService.completeRequest({
      inferenceRequestId: inferenceRequest.id,
      userId: input.context.user.id,
      promptTokens: providerResponse.usage.promptTokens,
      completionTokens: providerResponse.usage.completionTokens,
      totalTokens: providerResponse.usage.totalTokens,
      latencyMs: providerResponse.metrics.latencyMs,
      responseCompletionTimeMs: providerResponse.metrics.responseCompletionTimeMs,
      inputPricePerToken: modelRecord.inputPricePerToken,
      outputPricePerToken: modelRecord.outputPricePerToken,
      platformMarkupPercent: input.context.creditCheck.platformMarkupPercent,
      walletReferenceId: inferenceRequest.id,
      walletDeductionDescription: "AI Model Usage",
    });

    return mapToOpenAICompatibleResponse(input.body.model, providerResponse);
  }

  async executeStream(
    input: ExecuteCompletionInput,
    options: ExecuteStreamOptions
  ): Promise<AsyncIterable<string>> {
    const modelRecord = await resolveModelRecord(input.body.model);
    const startedAt = Date.now();
    const providerRequest = buildProviderRequest({
      ...input,
      body: {
        ...input.body,
        stream: true,
      },
    });

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
          promptTokens: accumulator.usage.promptTokens,
          completionTokens: accumulator.usage.completionTokens,
          totalTokens: accumulator.usage.totalTokens,
          latencyMs,
          responseCompletionTimeMs,
          inputPricePerToken: modelRecord.inputPricePerToken,
          outputPricePerToken: modelRecord.outputPricePerToken,
          platformMarkupPercent: input.context.creditCheck.platformMarkupPercent,
          walletReferenceId: inferenceRequest.id,
          walletDeductionDescription: "AI Model Usage",
        });
        settled = true;

        yield toSseMessage(
          buildOpenAIFinalChunk(
            accumulator.requestId,
            input.body.model,
            accumulator.finishReason,
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
