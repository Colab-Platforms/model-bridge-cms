import { Router } from "express";

import { getAllModelsController, getModelByIdController } from "./models.controller.js";
import { getAllModelsQueryValidator, modelIdParamsValidator } from "./models.validators.js";

const router = Router();

router.get("/", getAllModelsQueryValidator, getAllModelsController);
router.get("/:id", modelIdParamsValidator, getModelByIdController);

export default router;
