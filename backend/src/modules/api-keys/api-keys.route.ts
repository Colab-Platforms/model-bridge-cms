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

router.post("/", auth(), createApiKeyValidator, createApiKeyController);
router.get("/", auth(), getAllApiKeysQueryValidator, getAllApiKeysController);
router.get("/project/:projectId", auth(), apiKeyProjectIdParamsValidator, getApiKeysByProjectIdController);
router.get("/user/:userId", auth(), apiKeyUserIdParamsValidator, getApiKeysByUserIdController);
router.get("/:id", auth(), apiKeyIdParamsValidator, getApiKeyByIdController);
router.patch("/:id", auth(), apiKeyIdParamsValidator, updateApiKeyValidator, updateApiKeyController);
router.delete("/:id", auth(), apiKeyIdParamsValidator, deleteApiKeyController);

export default router;
