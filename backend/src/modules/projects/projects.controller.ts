import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  CreateProjectInput,
  GetAllProjectsQuery,
  ProjectIdParams,
  UpdateProjectInput,
} from "./projects.types.js";
import {
  createProjectService,
  deleteProjectService,
  getAllProjectsService,
  getProjectByIdService,
  updateProjectService,
} from "./projects.service.js";

const getActor = (req: Request) =>
  (req as Request & { user?: { id?: string } }).user;

export const createProjectController = async (req: Request, res: Response) => {
  const actor = getActor(req);
  const body = req.body as CreateProjectInput;
  const result = await createProjectService(actor?.id as string, body, actor?.id);

  return sendResponse(res, true, result, "Project created successfully", STATUS_CODES.CREATED);
};

export const getAllProjectsController = async (req: Request, res: Response) => {
  const actor = getActor(req);
  const query = req.query as GetAllProjectsQuery;
  const result = await getAllProjectsService(actor?.id as string, query);

  return sendResponse(res, true, result, "Projects fetched successfully", STATUS_CODES.OK);
};

export const getProjectByIdController = async (req: Request, res: Response) => {
  const actor = getActor(req);
  const { id } = req.params as ProjectIdParams;
  const result = await getProjectByIdService(actor?.id as string, id);

  return sendResponse(res, true, result, "Project fetched successfully", STATUS_CODES.OK);
};

export const updateProjectController = async (req: Request, res: Response) => {
  const actor = getActor(req);
  const { id } = req.params as ProjectIdParams;
  const body = req.body as UpdateProjectInput;
  const result = await updateProjectService(actor?.id as string, id, body, actor?.id);

  return sendResponse(res, true, result, "Project updated successfully", STATUS_CODES.OK);
};

export const deleteProjectController = async (req: Request, res: Response) => {
  const actor = getActor(req);
  const { id } = req.params as ProjectIdParams;
  const result = await deleteProjectService(actor?.id as string, id, actor?.id);

  return sendResponse(res, true, result, "Project deleted successfully", STATUS_CODES.OK);
};
