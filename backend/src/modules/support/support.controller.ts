import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { createTicketService } from "./support.service.js";
import type { CreateSupportTicketInput } from "./support.types.js";

export const createTicketController = async (req: Request, res: Response) => {
  const actor = (req as Request & { user?: { id: string; email: string } }).user;
  const body = req.body as CreateSupportTicketInput;

  const result = await createTicketService(body, actor!.id, actor!.email, req.file);

  return sendResponse(res, true, result, "Support ticket submitted successfully", STATUS_CODES.CREATED);
};
