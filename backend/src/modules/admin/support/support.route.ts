import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import {
  getAdminSupportTicketByIdController,
  getAdminSupportTicketsController,
  updateAdminSupportTicketStatusController,
} from "./support.controller.js";
import {
  adminSupportTicketIdParamsValidator,
  adminSupportTicketsQueryValidator,
  updateAdminSupportTicketStatusValidator,
} from "./support.validators.js";

const router = Router();

router.get(
  "/",
  auth("ADMIN", "SUPERADMIN"),
  adminSupportTicketsQueryValidator,
  getAdminSupportTicketsController
);
router.get(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  adminSupportTicketIdParamsValidator,
  getAdminSupportTicketByIdController
);
router.patch(
  "/:id/status",
  auth("ADMIN", "SUPERADMIN"),
  adminSupportTicketIdParamsValidator,
  updateAdminSupportTicketStatusValidator,
  updateAdminSupportTicketStatusController
);

export default router;
