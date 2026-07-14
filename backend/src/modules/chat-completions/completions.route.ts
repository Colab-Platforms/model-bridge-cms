import { Router } from "express";

import apiKeyAuth from "../../shared/middlewares/apikeyvalidations.js";
import checkCredits from "../../shared/middlewares/checkApiCredits.js";
import validateRequestedModalities from "../../shared/middlewares/validateRequestedModalities.js";
import { chatCompletionsController } from "./completions.controller.js";
import { chatCompletionsValidator } from "./completions.validators.js";
import guardrailMiddleware from "../guardrails/guardrail.middleware.js";
import resolveRoutingModel from "../routing/routing.middleware.js";

const router = Router();

router.post(
  "/",
  chatCompletionsValidator,
  apiKeyAuth,
  resolveRoutingModel,
  validateRequestedModalities,
  guardrailMiddleware,
  checkCredits,
  chatCompletionsController
);

export default router;
