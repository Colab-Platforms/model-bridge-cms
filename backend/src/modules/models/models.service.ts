import { Prisma } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { CACHE_KEYS, CACHE_TTL } from "../../shared/constants/cacheKeys.js";
import { cacheGet, cacheSet } from "../../shared/utils/cache.js";
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
  outputPricingUnit: true,
  imageOutputPrice: true,
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
      providerLogo: true,
      isActive: true,
    },
  },
} as Prisma.ModelSelect;

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
    imageOutputPrice: Prisma.Decimal | null;
    cacheWritePricePerToken: Prisma.Decimal | null;
    cacheReadPricePerToken: Prisma.Decimal | null;
  },
>(
  model: T
) => ({
  ...model,
  inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
  outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
  imageOutputPrice: formatDecimalValue(model.imageOutputPrice),
  cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
  cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
});

const hasAndConditions = (
  where: Prisma.ModelWhereInput
): where is { AND: Prisma.ModelWhereInput[] } =>
  "AND" in where && Array.isArray(where.AND);

const sortMap: Record<NonNullable<GetAllModelsQuery["sort"]>, string> = {
  newest: "createdAt:desc",
  name_asc: "displayName:asc",
  price_input_asc: "inputPricePerToken:asc",
  price_input_desc: "inputPricePerToken:desc",
  price_output_asc: "outputPricePerToken:asc",
  price_output_desc: "outputPricePerToken:desc",
  context_asc: "contextLength:asc",
  context_desc: "contextLength:desc",
};

const normalizeScalarFilter = (values?: string[]) => {
  if (!values?.length) {
    return undefined;
  }

  return values.join(",");
};

const perMillionToPerToken = (value?: number) =>
  value === undefined ? undefined : value / 1_000_000;

const capabilityToOutputModalityMap: Partial<Record<string, string>> = {
  TEXT: "text",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  SPEECH: "audio",
};

const normalizeCapabilityFilters = (capabilities?: string[]) =>
  capabilities
    ?.map((capability) => capabilityToOutputModalityMap[capability])
    .filter((value): value is string => Boolean(value));

const buildModelsQuerySignature = (query: GetAllModelsQuery) =>
  [
    `q=${query.q ?? ""}`,
    `providerId=${query.providerId?.join(",") ?? ""}`,
    `slug=${query.slug ?? ""}`,
    `capability=${query.capability?.join(",") ?? ""}`,
    `inputModality=${query.inputModality?.join(",") ?? ""}`,
    `outputModality=${query.outputModality?.join(",") ?? ""}`,
    `isActive=${query.isActive ?? ""}`,
    `minContext=${query.minContext ?? ""}`,
    `maxContext=${query.maxContext ?? ""}`,
    `maxInputPrice=${query.maxInputPrice ?? ""}`,
    `maxOutputPrice=${query.maxOutputPrice ?? ""}`,
    `sort=${query.sort ?? ""}`,
    `page=${query.page ?? ""}`,
    `pageSize=${query.pageSize ?? ""}`,
  ].join(":");

const buildBaseModelsQuery = (query: GetAllModelsQuery) => {
  try {
    return buildPrismaQuery({
      query: {
        search: query.q,
        providerId: normalizeScalarFilter(query.providerId),
        slug: query.slug,
        isActive: query.isActive,
        contextLength_min: query.minContext,
        contextLength_max: query.maxContext,
        inputPricePerToken_max: perMillionToPerToken(query.maxInputPrice),
        outputPricePerToken_max: perMillionToPerToken(query.maxOutputPrice),
        sort: query.sort ? sortMap[query.sort] : undefined,
      },
      searchFields: [
        { field: "slug" },
        { field: "displayName" },
        { field: "description" },
        { field: "displayName", model: "provider" },
      ],
      filterFields: [
        { key: "providerId", field: "providerId", type: "string" },
        { key: "slug", field: "slug", type: "string" },
        { key: "isActive", field: "isActive", type: "boolean" },
        { key: "contextLength", field: "contextLength", type: "number" },
        { key: "inputPricePerToken", field: "inputPricePerToken", type: "number" },
        { key: "outputPricePerToken", field: "outputPricePerToken", type: "number" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "displayName", field: "displayName" },
        { key: "contextLength", field: "contextLength" },
        { key: "inputPricePerToken", field: "inputPricePerToken" },
        { key: "outputPricePerToken", field: "outputPricePerToken" },
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      softDelete: {
        field: "isDeleted",
        value: false,
      },
      strict: true,
      allowedQueryKeys: [],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildArrayFilterConditions = (query: GetAllModelsQuery): Prisma.ModelWhereInput[] => {
  const conditions: Prisma.ModelWhereInput[] = [];
  const normalizedCapabilities = normalizeCapabilityFilters(query.capability);

  if (normalizedCapabilities?.length) {
    conditions.push({
      OR: normalizedCapabilities.map((modality) => ({
        outputModalities: { has: modality },
      })),
    });
  }

  if (query.inputModality?.length) {
    conditions.push({
      OR: query.inputModality.map((modality) => ({
        inputModalities: { has: modality },
      })),
    });
  }

  return conditions;
};

export const getAllModelsService = async (query: GetAllModelsQuery) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 10);
  const cacheKey = CACHE_KEYS.MODELS.LIST(buildModelsQuerySignature(query));

  const cached = await cacheGet<any>(cacheKey);
  if (cached) return cached;

  const qbQuery = buildBaseModelsQuery(query);
  const andConditions: Prisma.ModelWhereInput[] = [];

  if (hasAndConditions(qbQuery.where)) {
    andConditions.push(...qbQuery.where.AND);
  }

  andConditions.push(...buildArrayFilterConditions(query));

  const where: Prisma.ModelWhereInput = andConditions.length ? { AND: andConditions } : {};

  const [models, totalRecords] = await Promise.all([
    prisma.model.findMany({
      where,
      select: modelSelect,
      orderBy: qbQuery.orderBy,
      take,
      skip,
    }),
    prisma.model.count({ where }),
  ]);

  const result = {
    ...formatPaginationResponse(
      models.map((model) => formatModelPriceFields(model)),
      totalRecords,
      page,
      pageSize
    ),
    ...(qbQuery.meta ? { meta: qbQuery.meta } : {}),
  };

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

