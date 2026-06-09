import { Router } from "express";

import apiKeyAuth from "../../shared/middlewares/apikeyvalidations.js";
import checkCredits from "../../shared/middlewares/checkApiCredits.js";
import { chatCompletionsController } from "./completions.controller.js";
import { chatCompletionsValidator } from "./completions.validators.js";

const router = Router();

router.post("/", chatCompletionsValidator, apiKeyAuth, checkCredits, chatCompletionsController);

export default router;
