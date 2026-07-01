import { Prisma, RequestStatus, RequestType } from "@prisma/client";

import prisma from "../../prisma.js";
import { cacheInvalidatePattern } from "../shared/utils/cache.js";
import { deductCredits, refundCredits } from "../modules/wallets/wallets.service.js";

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
  requestedModelSlug: string;
  resolvedModelSlug: string;
  stream: boolean;
  requestType?: RequestType;
}

export interface CompleteInferenceInput {
  inferenceRequestId: string;
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  responseCompletionTimeMs: number;
  isFreeModel?: boolean;
  inputPricePerToken: number;
  outputPricePerToken: number;
  platformMarkupPercent: number;
  walletDeductionDescription?: string;
  walletCreatedBy?: string;
  walletReferenceId?: string;
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
        requestedModelSlug: input.requestedModelSlug,
        resolvedModelSlug: input.resolvedModelSlug,
        stream: input.stream,
        requestType: input.requestType ?? RequestType.CHAT,
        status: RequestStatus.PENDING,
      },
    });
  }

  calculateBilling(input: {
    promptTokens: number;
    completionTokens: number;
    isFreeModel?: boolean;
    inputPricePerToken: number;
    outputPricePerToken: number;
    platformMarkupPercent: number;
  }): BillingResult {
    if (input.isFreeModel) {
      return {
        providerCost: 0,
        platformMarkup: 0,
        totalCost: 0,
      };
    }

    const inputCost = input.promptTokens * input.inputPricePerToken;
    const outputCost = input.completionTokens * input.outputPricePerToken;
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
      isFreeModel: input.isFreeModel,
      inputPricePerToken: input.inputPricePerToken,
      outputPricePerToken: input.outputPricePerToken,
      platformMarkupPercent: input.platformMarkupPercent,
    });

    let creditsDeducted = false;

    try {
      if (billing.totalCost > 0) {
        await deductCredits({
          userId: input.userId,
          amount: billing.totalCost,
          inferenceRequestId: input.inferenceRequestId,
          createdBy: input.walletCreatedBy,
          referenceId: input.walletReferenceId,
          description: input.walletDeductionDescription ?? "AI Model Usage",
        });
        creditsDeducted = true;
      }

      const updatedRequest = await prisma.inferenceRequest.update({
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

      await Promise.all([
        cacheInvalidatePattern(`overview:${input.userId}:*`),
        cacheInvalidatePattern("admin:overview:*"),
      ]);

      return {
        inferenceRequest: updatedRequest,
        billing,
      };
    } catch (error) {
      if (creditsDeducted) {
        try {
          await refundCredits({
            userId: input.userId,
            amount: billing.totalCost,
            inferenceRequestId: input.inferenceRequestId,
            createdBy: input.walletCreatedBy,
            referenceId: input.walletReferenceId,
            description: "Rollback refund after inference completion failure",
          });
        } catch (refundError) {
          console.error("Refund rollback failed after inference completion error:", refundError);
        }
      }

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
