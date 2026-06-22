import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  createAdminModelService,
  createAdminProviderService,
  deleteAdminUserService,
  deleteAdminApiKeyService,
  deleteAdminModelService,
  deleteAdminProviderService,
  getAdminApiKeyByIdService,
  getAdminModelByIdService,
  getAdminModelsService,
  getAdminProviderByIdService,
  getAdminProvidersService,
  getAdminUserApiKeysService,
  getAdminUserByIdService,
  getAdminUserProjectsService,
  getAdminUsersService,
  getAdminActivityLogsService,
  getAdminActivitySummaryService,
  getAdminActivityTimeseriesService,
  getAdminOverviewService,
  updateAdminModelService,
  updateAdminProviderService,
  updateAdminUserStatusService,
  updateAdminApiKeyStatusService,
} from "./admin.service.js";
import type {
  AdminApiKeyStatusBody,
  AdminActivityLogsQuery,
  AdminActivitySummaryQuery,
  AdminActivityTimeseriesQuery,
  AdminActor,
  AdminModelBody,
  AdminModelUpdateBody,
  AdminModelsQuery,
  AdminOverviewQuery,
  AdminProviderBody,
  AdminProviderQuery,
  AdminProviderUpdateBody,
  AdminUserIdParams,
  AdminUsersQuery,
  AdminUserStatusBody,
} from "./admin.types.js";

const getActor = (req: Request): AdminActor => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;

  return {
    id: actor?.id as string,
    roles: actor?.roles ?? [],
  };
};

export const getAdminOverviewController = async (req: Request, res: Response) => {
  const result = await getAdminOverviewService(
    getActor(req),
    req.query as AdminOverviewQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin overview fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityLogsController = async (req: Request, res: Response) => {
  const result = await getAdminActivityLogsService(
    getActor(req),
    req.query as AdminActivityLogsQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity logs fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivitySummaryController = async (req: Request, res: Response) => {
  const result = await getAdminActivitySummaryService(
    getActor(req),
    req.query as AdminActivitySummaryQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity summary fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminActivityTimeseriesController = async (req: Request, res: Response) => {
  const result = await getAdminActivityTimeseriesService(
    getActor(req),
    req.query as AdminActivityTimeseriesQuery
  );

  return sendResponse(
    res,
    true,
    result,
    "Admin activity timeseries fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminUsersController = async (req: Request, res: Response) => {
  const result = await getAdminUsersService(getActor(req), req.query as AdminUsersQuery);

  return sendResponse(
    res,
    true,
    result,
    "Admin users fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminUserByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminUserByIdService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin user fetched successfully",
    STATUS_CODES.OK
  );
};

export const updateAdminUserStatusController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const body = req.body as AdminUserStatusBody;
  const result = await updateAdminUserStatusService(getActor(req), id, body);

  return sendResponse(
    res,
    true,
    result,
    "Admin user status updated successfully",
    STATUS_CODES.OK
  );
};

export const deleteAdminUserController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await deleteAdminUserService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin user deleted successfully",
    STATUS_CODES.OK
  );
};

export const getAdminUserProjectsController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminUserProjectsService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin user projects fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminUserApiKeysController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminUserApiKeysService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin user API keys fetched successfully",
    STATUS_CODES.OK
  );
};

export const getAdminApiKeyByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminApiKeyByIdService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin API key fetched successfully",
    STATUS_CODES.OK
  );
};

export const updateAdminApiKeyStatusController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const body = req.body as AdminApiKeyStatusBody;
  const result = await updateAdminApiKeyStatusService(getActor(req), id, body);

  return sendResponse(
    res,
    true,
    result,
    "Admin API key status updated successfully",
    STATUS_CODES.OK
  );
};

export const deleteAdminApiKeyController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await deleteAdminApiKeyService(getActor(req), id);

  return sendResponse(
    res,
    true,
    result,
    "Admin API key deleted successfully",
    STATUS_CODES.OK
  );
};

export const getAdminProvidersController = async (req: Request, res: Response) => {
  const result = await getAdminProvidersService(getActor(req), req.query as AdminProviderQuery);

  return sendResponse(res, true, result, "Admin providers fetched successfully", STATUS_CODES.OK);
};

export const getAdminProviderByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminProviderByIdService(getActor(req), id);

  return sendResponse(res, true, result, "Admin provider fetched successfully", STATUS_CODES.OK);
};

export const createAdminProviderController = async (req: Request, res: Response) => {
  const result = await createAdminProviderService(getActor(req), req.body as AdminProviderBody);

  return sendResponse(res, true, result, "Admin provider created successfully", STATUS_CODES.CREATED);
};

export const updateAdminProviderController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await updateAdminProviderService(
    getActor(req),
    id,
    req.body as AdminProviderUpdateBody
  );

  return sendResponse(res, true, result, "Admin provider updated successfully", STATUS_CODES.OK);
};

export const deleteAdminProviderController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await deleteAdminProviderService(getActor(req), id);

  return sendResponse(res, true, result, "Admin provider deleted successfully", STATUS_CODES.OK);
};

export const getAdminModelsController = async (req: Request, res: Response) => {
  const result = await getAdminModelsService(getActor(req), req.query as AdminModelsQuery);

  return sendResponse(res, true, result, "Admin models fetched successfully", STATUS_CODES.OK);
};

export const getAdminModelByIdController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await getAdminModelByIdService(getActor(req), id);

  return sendResponse(res, true, result, "Admin model fetched successfully", STATUS_CODES.OK);
};

export const createAdminModelController = async (req: Request, res: Response) => {
  const result = await createAdminModelService(getActor(req), req.body as AdminModelBody);

  return sendResponse(res, true, result, "Admin model created successfully", STATUS_CODES.CREATED);
};

export const updateAdminModelController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await updateAdminModelService(getActor(req), id, req.body as AdminModelUpdateBody);

  return sendResponse(res, true, result, "Admin model updated successfully", STATUS_CODES.OK);
};

export const deleteAdminModelController = async (req: Request, res: Response) => {
  const { id } = req.params as AdminUserIdParams;
  const result = await deleteAdminModelService(getActor(req), id);

  return sendResponse(res, true, result, "Admin model deleted successfully", STATUS_CODES.OK);
};
