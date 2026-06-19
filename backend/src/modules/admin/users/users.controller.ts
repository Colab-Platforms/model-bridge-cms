import { Request, Response } from "express";

import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import {
  deleteAdminUserService,
  getAdminUserByIdService,
  getAdminUsersService,
  updateAdminUserService,
} from "./users.service.js";
import type { AdminUserIdParams, AdminUsersQuery, UpdateAdminUserInput } from "./users.types.js";

const getActor = (req: Request) =>
  (req as Request & { user?: { id?: string; roles?: string[] } }).user;

export const getAdminUsersController = async (req: Request, res: Response) => {
  const query = req.query as AdminUsersQuery;
  const result = await getAdminUsersService(query);
  return sendResponse(res, true, result, "Users fetched successfully", STATUS_CODES.OK);
};

export const getAdminUserByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminUserByIdService(id);
  return sendResponse(res, true, result, "User fetched successfully", STATUS_CODES.OK);
};

export const updateAdminUserController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const body = req.body as UpdateAdminUserInput;
  const actor = getActor(req);
  const result = await updateAdminUserService(id, body, {
    actorId: actor?.id,
    actorRoles: actor?.roles ?? [],
  });
  return sendResponse(res, true, result, "User updated successfully", STATUS_CODES.OK);
};

export const deleteAdminUserController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const actor = getActor(req);
  const result = await deleteAdminUserService(id, {
    actorId: actor?.id,
    actorRoles: actor?.roles ?? [],
  });
  return sendResponse(res, true, result, "User deleted successfully", STATUS_CODES.OK);
};
