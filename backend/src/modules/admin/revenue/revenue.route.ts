import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import {
  getAdminRevenueByApiKeysController,
  getAdminRevenueByModelsController,
  getAdminRevenueByProjectsController,
  getAdminRevenueByProvidersController,
  getAdminRevenueByUsersController,
  getAdminRevenueSummaryController,
  getAdminRevenueTimeseriesController,
} from "./revenue.controller.js";
import {
  adminRevenueByApiKeysQueryValidator,
  adminRevenueByModelsQueryValidator,
  adminRevenueByProjectsQueryValidator,
  adminRevenueByProvidersQueryValidator,
  adminRevenueByUsersQueryValidator,
  adminRevenueSummaryQueryValidator,
  adminRevenueTimeseriesQueryValidator,
} from "./revenue.validators.js";

const router = Router();

router.get(
  "/summary",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueSummaryQueryValidator,
  getAdminRevenueSummaryController
);
router.get(
  "/timeseries",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueTimeseriesQueryValidator,
  getAdminRevenueTimeseriesController
);
router.get(
  "/by-users",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueByUsersQueryValidator,
  getAdminRevenueByUsersController
);
router.get(
  "/by-models",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueByModelsQueryValidator,
  getAdminRevenueByModelsController
);
router.get(
  "/by-providers",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueByProvidersQueryValidator,
  getAdminRevenueByProvidersController
);
router.get(
  "/by-projects",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueByProjectsQueryValidator,
  getAdminRevenueByProjectsController
);
router.get(
  "/by-api-keys",
  auth("ADMIN", "SUPERADMIN"),
  adminRevenueByApiKeysQueryValidator,
  getAdminRevenueByApiKeysController
);

export default router;
