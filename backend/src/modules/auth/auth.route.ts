import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
	googleCallbackController,
	googleStartController,
	loginController,
	logoutAllController,
	logoutController,
	registerController,
	refreshController,
	verifyEmailOtpController,
	resendEmailOtpController,
} from "./auth.controller.js";
import {
	googleCallbackValidator,
	googleStartValidator,
	loginValidator,
	logoutValidator,
	registerValidator,
	refreshValidator,
	verifyEmailOtpValidator,
	resendEmailOtpValidator,
} from "./auth.validators.js";

const router = Router();

router.get("/google/start", googleStartValidator, googleStartController);
router.get("/google/callback", googleCallbackValidator, googleCallbackController);
router.post("/login", loginValidator, loginController);
router.post("/register", registerValidator, registerController);
router.post("/refresh", refreshValidator, refreshController);
router.post("/logout", logoutValidator, logoutController);
router.post("/logout-all", auth("USER", "ADMIN", "SUPERADMIN"), logoutAllController);

router.post("/verify-email-otp", verifyEmailOtpValidator, verifyEmailOtpController);
router.post("/resend-email-otp", resendEmailOtpValidator, resendEmailOtpController);
export default router;
