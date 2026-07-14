import { ComplexityTier, PlanTier, Prisma, RequestStatus, RequestType } from "@prisma/client";

import prisma from "../../prisma.js";
import { cacheInvalidatePattern } from "../shared/utils/cache.js";
import { deductCreditsInTransaction, refundCredits } from "../modules/wallets/wallets.service.js";
import { deductProviderUsageCost } from "../modules/providers/provider-balance.service.js";

export interface BillingResult {
  providerCost: number;
  platformMarkup: number;
  totalCost: number;
}

export interface CreatePendingInferenceInput {
  userId: string;
  projectId: string;
  apiKeyId: string;
  modelId: string;
  requestedModelSlug: string | string[];
  resolvedModelSlug: string;
  stream: boolean;
  requestType?: RequestType;
  routedTier?: PlanTier;
  routingReason?: string;
  complexityTier?: ComplexityTier;
  complexityScore?: number;
}

export interface CompleteInferenceInput {
  inferenceRequestId: string;
  userId: string;
  providerId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedPromptTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  latencyMs: number;
  responseCompletionTimeMs: number;
  isFreeModel?: boolean;
  inputPricePerToken: number;
  outputPricePerToken: number;
  outputPricingUnit?: "TOKEN" | "IMAGE";
  imageOutputPrice?: number;
  cacheWritePricePerToken: number;
  cacheReadPricePerToken: number;
  platformMarkupPercent: number;
  walletDeductionDescription?: string;
  walletCreatedBy?: string;
  walletReferenceId?: string;
  /** Set only when a free-tier fallback swapped the model after the initial provider call failed. */
  modelId?: string;
  resolvedModelSlug?: string;
  downgradedFromModelSlug?: string;
  routingReason?: string;
}

const roundCurrency = (value: number) => Number(value.toFixed(8));

export class InferenceTrackingService {
  async createPendingRequest(input: CreatePendingInferenceInput) {
    return prisma.inferenceRequest.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        apiKeyId: input.apiKeyId,
        modelId: input.modelId,
        requestedModelSlug: Array.isArray(input.requestedModelSlug)
          ? input.requestedModelSlug
          : [input.requestedModelSlug],
        resolvedModelSlug: input.resolvedModelSlug,
        stream: input.stream,
        requestType: input.requestType ?? RequestType.CHAT,
        status: RequestStatus.PENDING,
        routedTier: input.routedTier,
        routingReason: input.routingReason,
        complexityTier: input.complexityTier,
        complexityScore: input.complexityScore,
      },
    });
  }

  calculateBilling(input: {
    promptTokens: number;
    completionTokens: number;
    cachedPromptTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    isFreeModel?: boolean;
    inputPricePerToken: number;
    outputPricePerToken: number;
    outputPricingUnit?: "TOKEN" | "IMAGE";
    imageOutputPrice?: number;
    cacheWritePricePerToken: number;
    cacheReadPricePerToken: number;
    platformMarkupPercent: number;
  }): BillingResult {
    if (input.isFreeModel) {
      return {
        providerCost: 0,
        platformMarkup: 0,
        totalCost: 0,
      };
    }

    const cacheWriteTokens = Math.min(
      Math.max(input.cacheCreationInputTokens ?? 0, 0),
      input.promptTokens
    );
    const remainingPromptTokensAfterWrites = Math.max(input.promptTokens - cacheWriteTokens, 0);
    const cacheReadTokens = Math.min(
      Math.max(input.cacheReadInputTokens ?? input.cachedPromptTokens ?? 0, 0),
      remainingPromptTokensAfterWrites
    );
    const uncachedPromptTokens = Math.max(
      input.promptTokens - cacheWriteTokens - cacheReadTokens,
      0
    );

    const inputCost =
      uncachedPromptTokens * input.inputPricePerToken +
      cacheWriteTokens *
        (input.cacheWritePricePerToken > 0
          ? input.cacheWritePricePerToken
          : input.inputPricePerToken) +
      cacheReadTokens *
        (input.cacheReadPricePerToken > 0
          ? input.cacheReadPricePerToken
          : input.inputPricePerToken);
    const outputCost =
      input.outputPricingUnit === "IMAGE"
        ? Math.max(input.imageOutputPrice ?? 0, 0)
        : input.completionTokens * input.outputPricePerToken;
    const providerCost = inputCost + outputCost;
    const platformMarkup = (providerCost * input.platformMarkupPercent) / 100;
    const totalCost = providerCost + platformMarkup;

    return {
      providerCost: roundCurrency(providerCost),
      platformMarkup: roundCurrency(platformMarkup),
      totalCost: roundCurrency(totalCost),
    };
  }

  async completeRequest(input: CompleteInferenceInput) {
    const billing = this.calculateBilling({
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      cachedPromptTokens: input.cachedPromptTokens,
      cacheCreationInputTokens: input.cacheCreationInputTokens,
      cacheReadInputTokens: input.cacheReadInputTokens,
      isFreeModel: input.isFreeModel,
      inputPricePerToken: input.inputPricePerToken,
      outputPricePerToken: input.outputPricePerToken,
      outputPricingUnit: input.outputPricingUnit,
      imageOutputPrice: input.imageOutputPrice,
      cacheWritePricePerToken: input.cacheWritePricePerToken,
      cacheReadPricePerToken: input.cacheReadPricePerToken,
      platformMarkupPercent: input.platformMarkupPercent,
    });

    try {
      const updatedRequest = await prisma.$transaction(async (tx) => {
        if (billing.totalCost > 0) {
          await deductCreditsInTransaction(
            {
              userId: input.userId,
              amount: billing.totalCost,
              inferenceRequestId: input.inferenceRequestId,
              createdBy: input.walletCreatedBy,
              referenceId: input.walletReferenceId,
              description: input.walletDeductionDescription ?? "AI Model Usage",
            },
            tx
          );
        }

        if (billing.providerCost > 0) {
          await deductProviderUsageCost(
            {
              providerId: input.providerId,
              amount: billing.providerCost,
              inferenceRequestId: input.inferenceRequestId,
              createdBy: input.walletCreatedBy,
              referenceId: input.walletReferenceId,
              description: "Provider usage deduction",
              metadata: {
                userId: input.userId,
                totalCost: billing.totalCost,
                platformMarkup: billing.platformMarkup,
              },
            },
            tx
          );
        }

        return tx.inferenceRequest.update({
          where: {
            id: input.inferenceRequestId,
          },
          data: {
            status: RequestStatus.SUCCESS,
            promptTokens: input.promptTokens,
            completionTokens: input.completionTokens,
            totalTokens: input.totalTokens,
            providerCost: new Prisma.Decimal(billing.providerCost),
            platformMarkupPercent: new Prisma.Decimal(input.platformMarkupPercent),
            platformMarkup: new Prisma.Decimal(billing.platformMarkup),
            totalCost: new Prisma.Decimal(billing.totalCost),
            latencyMs: input.latencyMs,
            responseCompletionTimeMs: input.responseCompletionTimeMs,
            inputPriceSnapshot: new Prisma.Decimal(input.inputPricePerToken),
            outputPriceSnapshot: new Prisma.Decimal(input.outputPricePerToken),
          },
        });
      });

      await Promise.all([
        cacheInvalidatePattern(`overview:${input.userId}:*`),
        cacheInvalidatePattern("admin:overview:*"),
      ]);

      return {
        inferenceRequest: updatedRequest,
        billing,
      };
    } catch (error) {
      try {
        await this.failRequest(input.inferenceRequestId, RequestStatus.FAILED);
      } catch (failRequestError) {
        console.error("Failed to mark inference request as failed:", failRequestError);
      }
      throw error;
    }
  }

  async failRequest(inferenceRequestId: string, status: RequestStatus = RequestStatus.FAILED) {
    return prisma.inferenceRequest.update({
      where: {
        id: inferenceRequestId,
      },
      data: {
        status,
      },
    });
  }

  async handleProviderFailure(
    inferenceRequestId: string,
    status: RequestStatus = RequestStatus.FAILED
  ) {
    const result = await this.failRequest(inferenceRequestId, status);
    await cacheInvalidatePattern("admin:overview:*");
    return result;
  }

  async refundDeductedCredits(input: {
    userId: string;
    inferenceRequestId: string;
    amount: number | string | Prisma.Decimal;
    createdBy?: string;
    referenceId?: string;
    description?: string;
  }) {
    await refundCredits({
      userId: input.userId,
      amount: input.amount,
      inferenceRequestId: input.inferenceRequestId,
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      description: input.description,
    });

    return this.failRequest(input.inferenceRequestId, RequestStatus.FAILED);
  }
}

export const inferenceTrackingService = new InferenceTrackingService();
