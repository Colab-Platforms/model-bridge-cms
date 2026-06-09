import { Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type { GetAllModelsQuery } from "./models.types.js";

const modelSelect = {
  id: true,
  providerId: true,
  slug: true,
  displayName: true,
  description: true,
  contextLength: true,
  maxOutputTokens: true,
  tokenizer: true,
  inputPricePerToken: true,
  outputPricePerToken: true,
  cacheWritePricePerToken: true,
  cacheReadPricePerToken: true,
  inputModalities: true,
  outputModalities: true,
  supportedParameters: true,
  defaultForCapabilities: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  provider: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      isActive: true,
    },
  },
} satisfies Prisma.ModelSelect;

export const getAllModelsService = async (query: GetAllModelsQuery) => {
  return prisma.model.findMany({
    where: {
      isDeleted: false,
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.slug ? { slug: query.slug } : {}),
      ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
    },
    select: modelSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getModelByIdService = async (id: string) => {
  const model = await prisma.model.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: modelSelect,
  });

  if (!model) {
    throw new AppError("Model not found", STATUS_CODES.NOT_FOUND);
  }

  return model;
};
