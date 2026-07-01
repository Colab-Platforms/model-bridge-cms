import { Router } from "express";

import apiKeyAuth from "../../shared/middlewares/apikeyvalidations.js";
import {
  apiKeyRateLimiter,
  apiUserRateLimiter,
} from "../../shared/middlewares/rateLimit.js";
import checkCredits from "../../shared/middlewares/checkApiCredits.js";
import validateRequestedModalities from "../../shared/middlewares/validateRequestedModalities.js";
import { chatCompletionsController } from "./completions.controller.js";
import { chatCompletionsValidator } from "./completions.validators.js";
import guardrailMiddleware from "../guardrails/guardrail.middleware.js";

const router = Router();

router.post(
  "/",
  chatCompletionsValidator,
  apiKeyAuth,
  apiKeyRateLimiter,
  apiUserRateLimiter,
  validateRequestedModalities,
  guardrailMiddleware,
  checkCredits,
  chatCompletionsController
);

export default router;
