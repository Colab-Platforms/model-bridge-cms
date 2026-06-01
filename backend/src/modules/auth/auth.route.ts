import { Router } from "express";

import { loginController } from "./auth.controller.js";
import { loginValidator } from "./auth.validators.js";

const router = Router();

router.post("/login", loginValidator, loginController);
export default router;