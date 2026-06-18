import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import {
  getAdminActivityByApiKeysController,
  getAdminActivityByModelsController,
  getAdminActivityByProjectsController,
  getAdminActivityByProvidersController,
  getAdminActivityByUsersController,
} from "./activity.controller.js";
import {
  adminActivityByApiKeysQueryValidator,
  adminActivityByModelsQueryValidator,
  adminActivityByProjectsQueryValidator,
  adminActivityByProvidersQueryValidator,
  adminActivityByUsersQueryValidator,
} from "./activity.validators.js";

const router = Router();

router.get(
  "/by-users",
  auth("ADMIN", "SUPERADMIN"),
  adminActivityByUsersQueryValidator,
  getAdminActivityByUsersController
);
router.get(
  "/by-models",
  auth("ADMIN", "SUPERADMIN"),
  adminActivityByModelsQueryValidator,
  getAdminActivityByModelsController
);
router.get(
  "/by-providers",
  auth("ADMIN", "SUPERADMIN"),
  adminActivityByProvidersQueryValidator,
  getAdminActivityByProvidersController
);
router.get(
  "/by-projects",
  auth("ADMIN", "SUPERADMIN"),
  adminActivityByProjectsQueryValidator,
  getAdminActivityByProjectsController
);
router.get(
  "/by-api-keys",
  auth("ADMIN", "SUPERADMIN"),
  adminActivityByApiKeysQueryValidator,
  getAdminActivityByApiKeysController
);

export default router;
