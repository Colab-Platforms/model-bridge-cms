import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import {
  deleteAdminUserController,
  getAdminUserByIdController,
  getAdminUsersController,
  updateAdminUserController,
} from "./users.controller.js";
import {
  adminUserIdParamsValidator,
  adminUsersQueryValidator,
  updateAdminUserValidator,
} from "./users.validators.js";

const router = Router();

router.get("/", auth("ADMIN", "SUPERADMIN"), adminUsersQueryValidator, getAdminUsersController);
router.get("/:id", auth("ADMIN", "SUPERADMIN"), adminUserIdParamsValidator, getAdminUserByIdController);
router.patch(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  adminUserIdParamsValidator,
  updateAdminUserValidator,
  updateAdminUserController
);
router.delete("/:id", auth("ADMIN", "SUPERADMIN"), adminUserIdParamsValidator, deleteAdminUserController);

export default router;
