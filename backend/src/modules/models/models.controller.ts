import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { getAllModelsService, getModelByIdService } from "./models.service.js";
import type { GetAllModelsQuery, ModelIdParams } from "./models.types.js";

export const getAllModelsController = async (req: Request, res: Response) => {
  const query = req.query as GetAllModelsQuery;
  const result = await getAllModelsService(query);

  return sendResponse(res, true, result, "Models fetched successfully", STATUS_CODES.OK);
};

export const getModelByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as ModelIdParams;
  const result = await getModelByIdService(id);

  return sendResponse(res, true, result, "Model fetched successfully", STATUS_CODES.OK);
};
