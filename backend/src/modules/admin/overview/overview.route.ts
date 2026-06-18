import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import { getAdminOverviewController } from "./overview.controller.js";
import { getAdminOverviewQueryValidator } from "./overview.validators.js";

const router = Router();

router.get(
  "/",
  auth("ADMIN", "SUPERADMIN"),
  getAdminOverviewQueryValidator,
  getAdminOverviewController
);

export default router;
