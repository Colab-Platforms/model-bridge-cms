import { Request, Response } from "express";

import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type {
  AdminActivityActor,
  AdminActivityByApiKeysQuery,
  AdminActivityByModelsQuery,
  AdminActivityByProjectsQuery,
  AdminActivityByProvidersQuery,
  AdminActivityByUsersQuery,
} from "./activity.types.js";
import {
  getAdminActivityByApiKeysService,
  getAdminActivityByModelsService,
  getAdminActivityByProjectsService,
  getAdminActivityByProvidersService,
  getAdminActivityByUsersService,
} from "./activity.service.js";

const getActor = (req: Request): AdminActivityActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getAdminActivityByUsersController = async (req: Request, res: Response) => {
  const result = await getAdminActivityByUsersService(
    getActor(req),
    req.query as AdminActivityByUsersQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity by users fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityByModelsController = async (req: Request, res: Response) => {
  const result = await getAdminActivityByModelsService(
    getActor(req),
    req.query as AdminActivityByModelsQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity by models fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityByProvidersController = async (req: Request, res: Response) => {
  const result = await getAdminActivityByProvidersService(
    getActor(req),
    req.query as AdminActivityByProvidersQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity by providers fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityByProjectsController = async (req: Request, res: Response) => {
  const result = await getAdminActivityByProjectsService(
    getActor(req),
    req.query as AdminActivityByProjectsQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity by projects fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityByApiKeysController = async (req: Request, res: Response) => {
  const result = await getAdminActivityByApiKeysService(
    getActor(req),
    req.query as AdminActivityByApiKeysQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity by API keys fetched successfully",
    STATUS_CODES.OK
  );
};
