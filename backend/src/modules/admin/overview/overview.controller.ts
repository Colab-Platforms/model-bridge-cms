import { Request, Response } from "express";

import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type { AdminOverviewActor, GetAdminOverviewQuery } from "./overview.types.js";
import { getAdminOverviewService } from "./overview.service.js";

const getActor = (req: Request): AdminOverviewActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getAdminOverviewController = async (req: Request, res: Response) => {
  const result = await getAdminOverviewService(
    getActor(req),
    req.query as GetAdminOverviewQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin overview fetched successfully",
    STATUS_CODES.OK
  );
};
