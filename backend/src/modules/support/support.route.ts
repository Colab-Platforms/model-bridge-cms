import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import { attachmentUploadMiddleware } from "../../shared/middlewares/upload.js";
import { createTicketController } from "./support.controller.js";
import { createSupportTicketValidator } from "./support.validators.js";

const router = Router();

router.post(
  "/tickets",
  auth("USER", "ADMIN"),
  attachmentUploadMiddleware("attachment"),
  createSupportTicketValidator,
  createTicketController
);

export default router;
