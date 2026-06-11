import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
	loginController,
	logoutAllController,
	logoutController,
	registerController,
	refreshController,
} from "./auth.controller.js";
import {
	loginValidator,
	logoutValidator,
	registerValidator,
	refreshValidator,
} from "./auth.validators.js";

const router = Router();

router.post("/login", loginValidator, loginController);
router.post("/register", registerValidator, registerController);
router.post("/refresh", refreshValidator, refreshController);
router.post("/logout", logoutValidator, logoutController);
router.post("/logout-all", auth("USER", "ADMIN", "SUPERADMIN"), logoutAllController);
export default router;
