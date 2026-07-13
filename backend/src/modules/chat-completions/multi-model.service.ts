import crypto from "node:crypto";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { completionsService } from "./completions.service.js";
import type {
  CreditCheckEstimate,
  ChatCompletionsInput,
  ExecuteCompletionInput,
  MultiModelChatCompletionError,
  MultiModelChatCompletionResponse,
  MultiModelChatCompletionResult,
  ExecuteCompletionResult,
  SingleModelChatCompletionsInput,
} from "./completions.types.js";

const DEFAULT_MULTI_MODEL_TIMEOUT_MS = 60_000;
const DEFAULT_MULTI_MODEL_RETRY_COUNT = 0;

const parsePositiveInteger = (rawValue: string | undefined, fallback: number) => {
  const parsedValue = Number(rawValue ?? fallback);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
};

const MULTI_MODEL_TIMEOUT_MS = parsePositiveInteger(
  process.env.MULTI_MODEL_TIMEOUT_MS,
  DEFAULT_MULTI_MODEL_TIMEOUT_MS
);
const MULTI_MODEL_RETRY_COUNT = parsePositiveInteger(
  process.env.MULTI_MODEL_RETRY_COUNT,
  DEFAULT_MULTI_MODEL_RETRY_COUNT
);

const toSingleModelBody = (
  body: ChatCompletionsInput,
  model: string
): SingleModelChatCompletionsInput => ({
  model,
  messages: body.messages,
  ...(body.cache_control !== undefined ? { cache_control: body.cache_control } : {}),
  ...(body.modalities !== undefined ? { modalities: body.modalities } : {}),
  ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
  ...(body.max_tokens !== undefined ? { max_tokens: body.max_tokens } : {}),
  ...(body.tools !== undefined ? { tools: body.tools } : {}),
  ...(body.tool_choice !== undefined ? { tool_choice: body.tool_choice } : {}),
  stream: body.stream ?? false,
});

const getRequestedModels = (body: ChatCompletionsInput) =>
  Array.isArray(body.model) ? body.model : [body.model];

const resolveModelCreditCheck = (creditCheck: CreditCheckEstimate, model: string): CreditCheckEstimate => {
  const modelEstimate = creditCheck.modelEstimates?.[model];

  if (!modelEstimate) {
    return creditCheck;
  }

  return {
    requestedModels: [model],
    estimatedPromptTokens: modelEstimate.estimatedPromptTokens,
    maxOutputTokens: modelEstimate.maxOutputTokens,
    estimatedInputCost: modelEstimate.estimatedInputCost,
    estimatedOutputCost: modelEstimate.estimatedOutputCost,
    platformFee: modelEstimate.platformFee,
    platformMarkupPercent: modelEstimate.platformMarkupPercent,
    totalEstimatedCost: modelEstimate.totalEstimatedCost,
    isFreeModel: modelEstimate.isFreeModel,
    modelEstimates: {
      [model]: modelEstimate,
    },
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, model: string): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new AppError(
              `Model "${model}" timed out after ${timeoutMs}ms`,
              STATUS_CODES.SERVER_ERROR,
              { code: "model_timeout", model, timeoutMs }
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const buildErrorPayload = (
  error: unknown,
  fallbackCode: string
): MultiModelChatCompletionError => {
  if (error instanceof AppError) {
    const details =
      typeof error.details === "object" && error.details !== null
        ? (error.details as Record<string, unknown>)
        : null;

    return {
      code: typeof details?.code === "string" ? details.code : fallbackCode,
      message: error.message,
      ...(typeof error.statusCode === "number" ? { statusCode: error.statusCode } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
    };
  }

  return {
    code: fallbackCode,
    message: "Unknown model execution failure",
  };
};

const buildSuccessResult = (
  model: string,
  executionResult: ExecuteCompletionResult,
  attempts: number,
  latencyMs: number
): MultiModelChatCompletionResult => ({
  model,
  status: "success",
  attempts,
  inferenceRequestId: executionResult.inferenceRequestId,
  latencyMs,
  response: executionResult.response,
  content: executionResult.response.choices[0]?.message.content,
  usage: executionResult.response.usage,
  finish_reason: executionResult.response.choices[0]?.finish_reason ?? null,
  billing: executionResult.billing,
});

const buildFailureResult = (
  model: string,
  status: "failed" | "timeout",
  error: unknown,
  attempts: number
): MultiModelChatCompletionResult => ({
  model,
  status,
  attempts,
  error: buildErrorPayload(error, status === "timeout" ? "model_timeout" : "model_failed"),
});

const aggregateUsage = (results: MultiModelChatCompletionResult[]) =>
  results.reduce(
    (accumulator, result) => {
      accumulator.prompt_tokens += result.usage?.prompt_tokens ?? 0;
      accumulator.completion_tokens += result.usage?.completion_tokens ?? 0;
      accumulator.total_tokens += result.usage?.total_tokens ?? 0;
      return accumulator;
    },
    {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    }
  );

const roundCurrency = (value: number) => Number(value.toFixed(8));

const aggregateBilling = (results: MultiModelChatCompletionResult[]) => {
  const totals = results.reduce(
    (accumulator, result) => {
      accumulator.providerCost += result.billing?.providerCost ?? 0;
      accumulator.platformMarkup += result.billing?.platformMarkup ?? 0;
      accumulator.totalCost += result.billing?.totalCost ?? 0;
      return accumulator;
    },
    {
      providerCost: 0,
      platformMarkup: 0,
      totalCost: 0,
    }
  );

  return {
    providerCost: roundCurrency(totals.providerCost),
    platformMarkup: roundCurrency(totals.platformMarkup),
    totalCost: roundCurrency(totals.totalCost),
  };
};

export class MultiModelCompletionsService {
  private async executeModelWithPolicies(input: {
    body: ChatCompletionsInput;
    context: ExecuteCompletionInput["context"];
    model: string;
  }): Promise<MultiModelChatCompletionResult> {
    const maxAttempts = MULTI_MODEL_RETRY_COUNT + 1;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      const startedAt = Date.now();

      try {
        const executionResult = await withTimeout(
          completionsService.executeDetailed({
            body: toSingleModelBody(input.body, input.model),
            context: {
              ...input.context,
              creditCheck: resolveModelCreditCheck(input.context.creditCheck, input.model),
            },
          }),
          MULTI_MODEL_TIMEOUT_MS,
          input.model
        );

        return buildSuccessResult(input.model, executionResult, attempt, Date.now() - startedAt);
      } catch (error) {
        lastError = error;
      }
    }

    const errorDetails =
      lastError instanceof AppError &&
      typeof lastError.details === "object" &&
      lastError.details !== null
        ? (lastError.details as Record<string, unknown>)
        : null;
    const status =
      errorDetails?.code === "model_timeout" ? "timeout" : "failed";

    return buildFailureResult(input.model, status, lastError, attempt);
  }

  async execute(input: {
    body: ChatCompletionsInput;
    context: ExecuteCompletionInput["context"];
  }): Promise<MultiModelChatCompletionResponse> {
    const models = getRequestedModels(input.body);

    const settledResults = await Promise.allSettled(
      models.map((model) =>
        this.executeModelWithPolicies({
          body: input.body,
          context: input.context,
          model,
        })
      )
    );

    const results = settledResults.map((settledResult, index) => {
      if (settledResult.status === "fulfilled") {
        return settledResult.value;
      }

      return buildFailureResult(models[index], "failed", settledResult.reason, 1);
    });

    const summary = {
      totalModels: results.length,
      successfulModels: results.filter((result) => result.status === "success").length,
      failedModels: results.filter((result) => result.status === "failed").length,
      timedOutModels: results.filter((result) => result.status === "timeout").length,
      usage: aggregateUsage(results),
      billing: aggregateBilling(results),
    };

    return {
      id: `mmreq_${crypto.randomUUID()}`,
      object: "chat.completion.group",
      created: Math.floor(Date.now() / 1000),
      results,
      summary,
    };
  }
}

export const multiModelCompletionsService = new MultiModelCompletionsService();
