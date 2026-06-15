import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import { getOverviewController } from "./overview.controller.js";
import { getOverviewQueryValidator } from "./overview.validators.js";

const router = Router();

router.get(
  "/",
  auth("USER", "ADMIN", "SUPERADMIN"),
  getOverviewQueryValidator,
  getOverviewController
);

export default router;
