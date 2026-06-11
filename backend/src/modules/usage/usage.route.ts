import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  getUsageLogsController,
  getUsageSummaryController,
  getUsageTimeseriesController,
} from "./usage.controller.js";
import {
  getUsageLogsQueryValidator,
  getUsageSummaryQueryValidator,
  getUsageTimeseriesQueryValidator,
} from "./usage.validators.js";

const router = Router();

router.get(
  "/logs",
  auth("USER", "ADMIN", "SUPERADMIN"),
  getUsageLogsQueryValidator,
  getUsageLogsController
);
router.get(
  "/summary",
  auth("USER", "ADMIN", "SUPERADMIN"),
  getUsageSummaryQueryValidator,
  getUsageSummaryController
);
router.get(
  "/timeseries",
  auth("USER", "ADMIN", "SUPERADMIN"),
  getUsageTimeseriesQueryValidator,
  getUsageTimeseriesController
);

export default router;
