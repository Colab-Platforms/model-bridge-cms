import { Request, Response } from "express";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";
import { getCurrentUserService } from "./users.service.js";

export const getCurrentUserController = async (req: Request, res: Response) => {
  const user = (req as Request & { user?: { id?: string } }).user;
  const result = await getCurrentUserService(user?.id as string);

  return sendResponse(
    res,
    true,
    result,
    "Current user fetched successfully",
    STATUS_CODES.OK
  );
};
