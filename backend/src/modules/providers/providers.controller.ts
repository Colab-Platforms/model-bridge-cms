import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  createProviderService,
  deleteProviderService,
  getAllProvidersService,
  getProviderByIdService,
  updateProviderService,
} from "./providers.service.js";
import type {
  CreateProviderInput,
  ProviderIdParams,
  ProviderListQuery,
  UpdateProviderInput,
} from "./providers.types.js";

export const getAllProvidersController = async (req: Request, res: Response) => {
  const query = req.query as ProviderListQuery;
  const result = await getAllProvidersService(query);

  return sendResponse(res, true, result, "Providers fetched successfully", STATUS_CODES.OK);
};

export const getProviderByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as ProviderIdParams;
  const result = await getProviderByIdService(id);

  return sendResponse(res, true, result, "Provider fetched successfully", STATUS_CODES.OK);
};

export const createProviderController = async (req: Request, res: Response) => {
  const body = req.body as CreateProviderInput;
  const result = await createProviderService(body);

  return sendResponse(res, true, result, "Provider created successfully", STATUS_CODES.CREATED);
};

export const updateProviderController = async (req: Request, res: Response) => {
  const { id } = req.params as ProviderIdParams;
  const body = req.body as UpdateProviderInput;
  const result = await updateProviderService(id, body);

  return sendResponse(res, true, result, "Provider updated successfully", STATUS_CODES.OK);
};

export const deleteProviderController = async (req: Request, res: Response) => {
  const { id } = req.params as ProviderIdParams;
  const result = await deleteProviderService(id);

  return sendResponse(res, true, result, "Provider deleted successfully", STATUS_CODES.OK);
};
