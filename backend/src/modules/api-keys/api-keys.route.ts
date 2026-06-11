import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  createApiKeyController,
  deleteApiKeyController,
  getAllApiKeysController,
  getApiKeyByIdController,
  getApiKeysByProjectIdController,
  getApiKeysByUserIdController,
  updateApiKeyController,
} from "./api-keys.controller.js";
import {
  apiKeyIdParamsValidator,
  apiKeyProjectIdParamsValidator,
  apiKeyUserIdParamsValidator,
  createApiKeyValidator,
  getAllApiKeysQueryValidator,
  updateApiKeyValidator,
} from "./api-keys.validators.js";

const router = Router();

router.post("/", auth("USER", "ADMIN"), createApiKeyValidator, createApiKeyController);
router.get("/", auth("USER", "ADMIN"), getAllApiKeysQueryValidator, getAllApiKeysController);
router.get("/project/:projectId", auth("USER", "ADMIN"), apiKeyProjectIdParamsValidator, getApiKeysByProjectIdController);
router.get("/user/:userId", auth("USER", "ADMIN"), apiKeyUserIdParamsValidator, getApiKeysByUserIdController);
router.get("/:id", auth("USER", "ADMIN"), apiKeyIdParamsValidator, getApiKeyByIdController);
router.patch("/:id", auth("USER", "ADMIN"), apiKeyIdParamsValidator, updateApiKeyValidator, updateApiKeyController);
router.delete("/:id", auth("USER", "ADMIN"), apiKeyIdParamsValidator, deleteApiKeyController);

export default router;
