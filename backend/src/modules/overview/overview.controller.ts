import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { getOverviewService } from "./overview.service.js";
import type { GetOverviewQuery, OverviewActor } from "./overview.types.js";

const getActor = (req: Request): OverviewActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getOverviewController = async (req: Request, res: Response) => {
  const result = await getOverviewService(getActor(req), req.query as GetOverviewQuery);

  return sendResponse(res, true, result, "Overview fetched successfully", STATUS_CODES.OK);
};
