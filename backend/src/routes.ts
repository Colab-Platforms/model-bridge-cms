
import { Router } from "express";
import { Request, Response } from "express";
import { sendResponse } from "./utils/responseUtils";
import STATUS_CODES from "./utils/statusCodes";

import authRoutes from "./modules/auth/auth.route.js";
import usersRoutes from "./modules/users/users.route.js";
import apiKeysRoutes from "./modules/api-keys/api-keys.route.js";
import projectsRoutes from "./modules/projects/projects.route.js";
import walletsRoutes from "./modules/wallets/wallets.route.js";
import billingRoutes from "./modules/billing/billing.route.js";
import paymentRoutes from "./modules/payment/payment.route.js";
import pricingRoutes from "./modules/pricing/pricing.route.js";
import modelsRoutes from "./modules/models/models.route.js";
import providersRoutes from "./modules/providers/providers.route.js";
import routingRoutes from "./modules/routing/routing.route.js";
import completionsRoutes from "./modules/chat-completions/completions.route.js";
import embeddingsRoutes from "./modules/embeddings/embeddings.route.js";
import imagesRoutes from "./modules/images/images.route.js";
import usageRoutes from "./modules/usage/usage.route.js";
import overviewRoutes from "./modules/overview/overview.route.js";
import analyticsRoutes from "./modules/analytics/analytics.route.js";
import rateLimitRoutes from "./modules/rate-limit/rate-limit.route.js";
import webhooksRoutes from "./modules/webhooks/webhooks.route.js";
import notificationsRoutes from "./modules/notifications/notifications.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import auditLogsRoutes from "./modules/audit-logs/audit-logs.route.js";
import settingsRoutes from "./modules/settings/settings.route.js";
import healthRoutes from "./modules/health/health.route.js";
import supportRoutes from "./modules/support/support.route.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  sendResponse(res, true, "", "Welcome to the Backend!", STATUS_CODES.OK);
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/api-keys", apiKeysRoutes);
router.use("/projects", projectsRoutes);
router.use("/wallets", walletsRoutes);
router.use("/billing", billingRoutes);
router.use("/payment", paymentRoutes);
router.use("/pricing", pricingRoutes);
router.use("/models", modelsRoutes);
router.use("/providers", providersRoutes);
router.use("/routing", routingRoutes);
router.use("/completions", completionsRoutes);
router.use("/chat/completions", completionsRoutes);
router.use("/embeddings", embeddingsRoutes);
router.use("/images", imagesRoutes);
router.use("/usage", usageRoutes);
router.use("/overview", overviewRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/rate-limit", rateLimitRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/admin", adminRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/settings", settingsRoutes);
router.use("/health", healthRoutes);
router.use("/support", supportRoutes);

export default router;
