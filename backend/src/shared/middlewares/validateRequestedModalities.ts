import type { NextFunction, Request, Response } from "express";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";

type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type ChatMessage = {
  content: string | MessageContentPart[] | null;
};

type ModalitiesRequestBody = {
  model: string | string[];
  messages?: ChatMessage[];
  modalities?: string[];
};

const normalizeModality = (modality: string) => modality.trim().toLowerCase();

const mapPartTypeToModality = (part: MessageContentPart): string => {
  if (part.type === "image_url") {
    return "image";
  }

  return "text";
};

const getRequestedModalities = (messages: ChatMessage[] = []) => {
  const requested = new Set<string>();

  for (const message of messages) {
    if (typeof message.content === "string") {
      requested.add("text");
      continue;
    }

    if (!Array.isArray(message.content)) {
      continue;
    }

    for (const part of message.content) {
      requested.add(mapPartTypeToModality(part));
    }
  }

  return Array.from(requested);
};

const getRequestedOutputModalities = (body: ModalitiesRequestBody) =>
  Array.isArray(body.modalities) && body.modalities.length > 0
    ? Array.from(new Set(body.modalities.map(normalizeModality).filter(Boolean)))
    : ["text"];

const getRequestedInputModalities = (body: ModalitiesRequestBody) => {
  const derivedModalities = getRequestedModalities(body.messages ?? []).map(normalizeModality);

  if (derivedModalities.length > 0) {
    return Array.from(new Set(derivedModalities));
  }

  return ["text"];
};

const getRequestedModelSlugs = (body: ModalitiesRequestBody) => {
  return Array.isArray(body.model) ? body.model : [body.model];
};

export const validateRequestedModalities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body as ModalitiesRequestBody;
    const requestedModels = getRequestedModelSlugs(body);

    if (requestedModels.length === 0) {
      return sendResponse(
        res,
        false,
        null,
        "Requested model is required",
        STATUS_CODES.BAD_REQUEST
      );
    }

    const requestedInputModalities = getRequestedInputModalities(body);
    const requestedOutputModalities = getRequestedOutputModalities(body);

    const modelRecords = await prisma.model.findMany({
      where: {
        slug: { in: Array.from(new Set(requestedModels)) },
        isDeleted: false,
        isActive: true,
      },
      select: {
        slug: true,
        inputModalities: true,
        outputModalities: true,
      },
    });

    const modelMap = new Map(modelRecords.map((modelRecord) => [modelRecord.slug, modelRecord]));
    const missingModels = requestedModels.filter((model) => !modelMap.has(model));

    if (missingModels.length > 0) {
      return sendResponse(
        res,
        false,
        missingModels.length === 1 && requestedModels.length === 1
          ? null
          : { missingModels },
        "Requested model not found",
        STATUS_CODES.NOT_FOUND
      );
    }

    for (const requestedModel of requestedModels) {
      const modelRecord = modelMap.get(requestedModel);

      if (!modelRecord) {
        continue;
      }

      const supportedInputModalities = modelRecord.inputModalities.map(normalizeModality);
      const supportedOutputModalities = modelRecord.outputModalities.map(normalizeModality);
      const unsupportedInputModalities = requestedInputModalities.filter(
        (modality) => !supportedInputModalities.includes(normalizeModality(modality))
      );
      const unsupportedOutputModalities = requestedOutputModalities.filter(
        (modality) => !supportedOutputModalities.includes(normalizeModality(modality))
      );

      if (unsupportedInputModalities.length > 0 || unsupportedOutputModalities.length > 0) {
        return sendResponse(
          res,
          false,
          {
            model: modelRecord.slug,
            requestedInputModalities,
            supportedInputModalities: modelRecord.inputModalities,
            unsupportedInputModalities,
            requestedOutputModalities,
            supportedOutputModalities: modelRecord.outputModalities,
            unsupportedOutputModalities,
          },
          "Requested input or output modalities are not supported by the selected model",
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default validateRequestedModalities;
