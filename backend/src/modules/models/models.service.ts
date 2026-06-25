import { Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type { GetAllModelsQuery } from "./models.types.js";
import { cacheGet, cacheSet } from "../../shared/utils/cache.js";
import { CACHE_KEYS, CACHE_TTL } from "../../shared/constants/cacheKeys.js";

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

const formatDecimalValue = (value: Prisma.Decimal | null) => {
  if (value === null) {
    return null;
  }

  const decimalPlaces = value.decimalPlaces();
  return value.toFixed(decimalPlaces);
};

const formatModelPriceFields = <
  T extends {
    inputPricePerToken: Prisma.Decimal | null;
    outputPricePerToken: Prisma.Decimal | null;
    cacheWritePricePerToken: Prisma.Decimal | null;
    cacheReadPricePerToken: Prisma.Decimal | null;
  },
>(
  model: T
) => ({
  ...model,
  inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
  outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
  cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
  cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
});

export const getAllModelsService = async (query: GetAllModelsQuery) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

  const cacheKey = CACHE_KEYS.MODELS.LIST(
    page,
    pageSize,
    query.providerId,
    query.slug,
    query.isActive
  );
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const where: Prisma.ModelWhereInput = {
    isDeleted: false,
    ...(query.providerId ? { providerId: query.providerId } : {}),
    ...(query.slug ? { slug: query.slug } : {}),
    ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
  };

  const [models, totalRecords] = await Promise.all([
    prisma.model.findMany({
      where,
      select: modelSelect,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.model.count({ where }),
  ]);

  const result = formatPaginationResponse(
    models.map((model) => formatModelPriceFields(model)),
    totalRecords,
    page,
    pageSize
  );

  await cacheSet(cacheKey, result, CACHE_TTL.MODELS);
  return result;
};

export const getModelByIdService = async (id: string) => {
  const cacheKey = CACHE_KEYS.MODELS.BY_ID(id);
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

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

  const result = formatModelPriceFields(model);
  await cacheSet(cacheKey, result, CACHE_TTL.MODELS);
  return result;
};

