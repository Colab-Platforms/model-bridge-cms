import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  getUsageLogsService,
  getUsageSummaryService,
  getUsageTimeseriesService,
} from "./usage.service.js";
import type {
  GetUsageLogsQuery,
  GetUsageSummaryQuery,
  GetUsageTimeseriesQuery,
  UsageActor,
} from "./usage.types.js";

const getActor = (req: Request): UsageActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getUsageLogsController = async (req: Request, res: Response) => {
  const result = await getUsageLogsService(getActor(req), req.query as GetUsageLogsQuery);

  return sendResponse(res, true, result, "Usage logs fetched successfully", STATUS_CODES.OK);
};

export const getUsageSummaryController = async (req: Request, res: Response) => {
  const result = await getUsageSummaryService(getActor(req), req.query as GetUsageSummaryQuery);

  return sendResponse(res, true, result, "Usage summary fetched successfully", STATUS_CODES.OK);
};

export const getUsageTimeseriesController = async (req: Request, res: Response) => {
  const result = await getUsageTimeseriesService(getActor(req), req.query as GetUsageTimeseriesQuery);

  return sendResponse(res, true, result, "Usage timeseries fetched successfully", STATUS_CODES.OK);
};
