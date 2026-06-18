import { Router } from "express";

import activityRoutes from "./activity/activity.route.js";
import overviewRoutes from "./overview/overview.route.js";
import revenueRoutes from "./revenue/revenue.route.js";

const router = Router();

router.use("/overview", overviewRoutes);
router.use("/revenue", revenueRoutes);
router.use("/activity", activityRoutes);

export default router;
