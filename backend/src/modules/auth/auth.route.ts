import { Router } from "express";

import { loginController, registerController, refreshController } from "./auth.controller.js";
import { loginValidator, registerValidator, refreshValidator } from "./auth.validators.js";

const router = Router();

router.post("/login", loginValidator, loginController);
router.post("/register", registerValidator, registerController);
router.post("/refresh", refreshValidator, refreshController);
export default router;