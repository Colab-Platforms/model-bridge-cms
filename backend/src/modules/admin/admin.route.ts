import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import activityRoutes from "./activity/activity.route.js";
import {
  createAdminModelController,
  deleteAdminModelController,
  getAdminModelByIdController,
  getAdminModelsController,
  updateAdminModelController,
} from "./admin.controller.js";
import usersRoutes from "./users/users.route.js";
import overviewRoutes from "./overview/overview.route.js";
import providerBalancesRoutes from "./provider-balances/provider-balances.route.js";
import revenueRoutes from "./revenue/revenue.route.js";
import supportRoutes from "./support/support.route.js";
import {
  adminModelBodyValidator,
  adminModelUpdateBodyValidator,
  adminModelsQueryValidator,
  adminUserIdParamsValidator,
} from "./admin.validators.js";

const router = Router();

router.use("/overview", overviewRoutes);
router.use("/revenue", revenueRoutes);
router.use("/activity", activityRoutes);
router.use("/users", usersRoutes);
router.use("/provider-balances", providerBalancesRoutes);
router.use("/support", supportRoutes);

router.get("/models", auth("ADMIN", "SUPERADMIN"), adminModelsQueryValidator, getAdminModelsController);
router.get(
  "/models/:id",
  auth("ADMIN", "SUPERADMIN"),
  adminUserIdParamsValidator,
  getAdminModelByIdController
);
router.post(
  "/models",
  auth("ADMIN", "SUPERADMIN"),
  adminModelBodyValidator,
  createAdminModelController
);
router.patch(
  "/models/:id",
  auth("ADMIN", "SUPERADMIN"),
  adminUserIdParamsValidator,
  adminModelUpdateBodyValidator,
  updateAdminModelController
);
router.delete(
  "/models/:id",
  auth("ADMIN", "SUPERADMIN"),
  adminUserIdParamsValidator,
  deleteAdminModelController
);

export default router;

