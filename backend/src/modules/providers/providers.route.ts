import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  createProviderController,
  deleteProviderController,
  getAllProvidersController,
  getProviderByIdController,
  updateProviderController,
} from "./providers.controller.js";
import {
  createProviderValidator,
  providerIdParamsValidator,
  providerListQueryValidator,
  updateProviderValidator,
} from "./providers.validators.js";

const router = Router();

router.get("/", auth("ADMIN", "SUPERADMIN"), providerListQueryValidator, getAllProvidersController);
router.get("/:id", auth("ADMIN", "SUPERADMIN"), providerIdParamsValidator, getProviderByIdController);
router.post("/", auth("ADMIN", "SUPERADMIN"), createProviderValidator, createProviderController);
router.patch(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  providerIdParamsValidator,
  updateProviderValidator,
  updateProviderController
);
router.delete("/:id", auth("ADMIN", "SUPERADMIN"), providerIdParamsValidator, deleteProviderController);

export default router;
