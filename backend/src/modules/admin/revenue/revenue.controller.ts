import { Request, Response } from "express";

import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type {
  AdminRevenueByApiKeysQuery,
  AdminRevenueByModelsQuery,
  AdminRevenueByProjectsQuery,
  AdminRevenueByProvidersQuery,
  AdminRevenueActor,
  AdminRevenueByUsersQuery,
  AdminRevenueSummaryQuery,
  AdminRevenueTimeseriesQuery,
} from "./revenue.types.js";
import {
  getAdminRevenueByApiKeysService,
  getAdminRevenueByModelsService,
  getAdminRevenueByProjectsService,
  getAdminRevenueByProvidersService,
  getAdminRevenueByUsersService,
  getAdminRevenueSummaryService,
  getAdminRevenueTimeseriesService,
} from "./revenue.service.js";

const getActor = (req: Request): AdminRevenueActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getAdminRevenueSummaryController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueSummaryService(
    getActor(req),
    req.query as AdminRevenueSummaryQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue summary fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueTimeseriesController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueTimeseriesService(
    getActor(req),
    req.query as AdminRevenueTimeseriesQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue timeseries fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueByUsersController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueByUsersService(
    getActor(req),
    req.query as AdminRevenueByUsersQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue by users fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueByModelsController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueByModelsService(
    getActor(req),
    req.query as AdminRevenueByModelsQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue by models fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueByProvidersController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueByProvidersService(
    getActor(req),
    req.query as AdminRevenueByProvidersQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue by providers fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueByProjectsController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueByProjectsService(
    getActor(req),
    req.query as AdminRevenueByProjectsQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue by projects fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminRevenueByApiKeysController = async (req: Request, res: Response) => {
  const result = await getAdminRevenueByApiKeysService(
    getActor(req),
    req.query as AdminRevenueByApiKeysQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin revenue by API keys fetched successfully",
    STATUS_CODES.OK
  );
};
