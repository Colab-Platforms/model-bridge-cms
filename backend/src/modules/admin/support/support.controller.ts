import { Request, Response } from "express";

import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import {
  getAdminSupportTicketByIdService,
  getAdminSupportTicketsService,
  updateAdminSupportTicketStatusService,
} from "./support.service.js";
import type {
  AdminSupportTicketIdParams,
  AdminSupportTicketsQuery,
  UpdateAdminSupportTicketStatusInput,
} from "./support.types.js";

export const getAdminSupportTicketsController = async (req: Request, res: Response) => {
  const query = req.query as AdminSupportTicketsQuery;
  const result = await getAdminSupportTicketsService(query);
  return sendResponse(res, true, result, "Support tickets fetched successfully", STATUS_CODES.OK);
};

export const getAdminSupportTicketByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as unknown as AdminSupportTicketIdParams;
  const result = await getAdminSupportTicketByIdService(id);
  return sendResponse(res, true, result, "Support ticket fetched successfully", STATUS_CODES.OK);
};

export const updateAdminSupportTicketStatusController = async (req: Request, res: Response) => {
  const { id } = req.params as unknown as AdminSupportTicketIdParams;
  const body = req.body as UpdateAdminSupportTicketStatusInput;
  const result = await updateAdminSupportTicketStatusService(id, body);
  return sendResponse(res, true, result, "Support ticket status updated successfully", STATUS_CODES.OK);
};
