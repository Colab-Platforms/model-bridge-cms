import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  createApiKeyService,
  deleteApiKeyService,
  getAllApiKeysService,
  getApiKeyByIdService,
  getApiKeysByProjectIdService,
  getApiKeysByUserIdService,
  updateApiKeyService,
} from "./api-keys.service.js";
import type {
  ApiKeyIdParams,
  ApiKeyProjectIdParams,
  ApiKeyUserIdParams,
  CreateApiKeyInput,
  GetAllApiKeysQuery,
  UpdateApiKeyInput,
} from "./api-keys.types.js";

const getActorId = (req: Request) => {
  const actor = (req as Request & { user?: { id?: string } }).user;
  return actor?.id;
};

export const createApiKeyController = async (req: Request, res: Response) => {
  const body = req.body as CreateApiKeyInput;
  const result = await createApiKeyService(body);

  return sendResponse(res, true, result, "API key created successfully", STATUS_CODES.CREATED);
};

export const getAllApiKeysController = async (req: Request, res: Response) => {
  const query = req.query as GetAllApiKeysQuery;
  const result = await getAllApiKeysService(query);

  return sendResponse(res, true, result, "API keys fetched successfully", STATUS_CODES.OK);
};

export const getMyApiKeysController = async (req: Request, res: Response) => {
  const actorId = getActorId(req) as string;
  const result = await getApiKeysByUserIdService(actorId);

  return sendResponse(res, true, result, "User API keys fetched successfully", STATUS_CODES.OK);
};

export const getApiKeyByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as ApiKeyIdParams;
  const result = await getApiKeyByIdService(id);

  return sendResponse(res, true, result, "API key fetched successfully", STATUS_CODES.OK);
};

export const updateApiKeyController = async (req: Request, res: Response) => {
  const { id } = req.params as ApiKeyIdParams;
  const body = req.body as UpdateApiKeyInput;
  const result = await updateApiKeyService(id, body);

  return sendResponse(res, true, result, "API key updated successfully", STATUS_CODES.OK);
};

export const getApiKeysByProjectIdController = async (req: Request, res: Response) => {
  const { projectId } = req.params as ApiKeyProjectIdParams;
  const result = await getApiKeysByProjectIdService(projectId);

  return sendResponse(
    res,
    true,
    result,
    "Project API keys fetched successfully",
    STATUS_CODES.OK
  );
};

export const getApiKeysByUserIdController = async (req: Request, res: Response) => {
  const { userId } = req.params as ApiKeyUserIdParams;
  const result = await getApiKeysByUserIdService(userId);

  return sendResponse(res, true, result, "User API keys fetched successfully", STATUS_CODES.OK);
};

export const deleteApiKeyController = async (req: Request, res: Response) => {
  const { id } = req.params as ApiKeyIdParams;
  const result = await deleteApiKeyService(id);

  return sendResponse(res, true, result, "API key deleted successfully", STATUS_CODES.OK);
};
