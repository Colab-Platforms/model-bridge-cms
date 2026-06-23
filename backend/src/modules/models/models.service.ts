import { Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
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
  const where: Prisma.ModelWhereInput = {
    isDeleted: false,
    ...(query.search
      ? {
          OR: [
            {
              slug: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              displayName: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
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

  return formatPaginationResponse(
    models.map((model) => formatModelPriceFields(model)),
    totalRecords,
    page,
    pageSize
  );
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

  return formatModelPriceFields(model);
};
