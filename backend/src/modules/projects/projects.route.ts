import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  createProjectController,
  deleteProjectController,
  getAllProjectsController,
  getProjectByIdController,
  updateProjectController,
} from "./projects.controller.js";
import {
  createProjectValidator,
  getAllProjectsQueryValidator,
  projectIdParamsValidator,
  updateProjectValidator,
} from "./projects.validators.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), createProjectValidator, createProjectController);
router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), getAllProjectsQueryValidator, getAllProjectsController);
router.get("/:id", auth("USER", "ADMIN", "SUPERADMIN"), projectIdParamsValidator, getProjectByIdController);
router.patch(
  "/:id",
  auth("USER", "ADMIN", "SUPERADMIN"),
  projectIdParamsValidator,
  updateProjectValidator,
  updateProjectController
);
router.delete(
  "/:id",
  auth("USER", "ADMIN", "SUPERADMIN"),
  projectIdParamsValidator,
  deleteProjectController
);

export default router;
