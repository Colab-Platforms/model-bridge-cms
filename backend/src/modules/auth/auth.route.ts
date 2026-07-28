import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
	forgotPasswordEmailRateLimiter,
	forgotPasswordIpRateLimiter,
	googleAuthIpRateLimiter,
	loginEmailRateLimiter,
	loginIpRateLimiter,
	refreshIpRateLimiter,
	registerEmailRateLimiter,
	registerIpRateLimiter,
	resendEmailOtpEmailRateLimiter,
	resendEmailOtpIpRateLimiter,
	resetPasswordEmailRateLimiter,
	resetPasswordIpRateLimiter,
	verifyEmailOtpEmailRateLimiter,
	verifyEmailOtpIpRateLimiter,
} from "../../shared/middlewares/rateLimit.js";
import {
	forgotPasswordController,
	googleCallbackController,
	googleStartController,
	loginController,
	logoutAllController,
	logoutController,
	registerController,
	refreshController,
	resetPasswordController,
	verifyEmailOtpController,
	resendEmailOtpController,
} from "./auth.controller.js";
import {
	forgotPasswordValidator,
	googleCallbackValidator,
	googleStartValidator,
	loginValidator,
	logoutValidator,
	registerValidator,
	refreshValidator,
	resetPasswordValidator,
	verifyEmailOtpValidator,
	resendEmailOtpValidator,
} from "./auth.validators.js";

const router = Router();

router.get("/google/start", googleAuthIpRateLimiter, googleStartValidator, googleStartController);
router.get("/google/callback", googleAuthIpRateLimiter, googleCallbackValidator, googleCallbackController);
router.post("/login", loginIpRateLimiter, loginEmailRateLimiter, loginValidator, loginController);
router.post("/register", registerIpRateLimiter, registerEmailRateLimiter, registerValidator, registerController);
router.post("/refresh", refreshIpRateLimiter, refreshValidator, refreshController);
router.post("/logout", logoutValidator, logoutController);
router.post("/logout-all", auth("USER", "ADMIN", "SUPERADMIN"), logoutAllController);

router.post(
	"/verify-email-otp",
	verifyEmailOtpIpRateLimiter,
	verifyEmailOtpEmailRateLimiter,
	verifyEmailOtpValidator,
	verifyEmailOtpController
);
router.post(
	"/resend-email-otp",
	resendEmailOtpIpRateLimiter,
	resendEmailOtpEmailRateLimiter,
	resendEmailOtpValidator,
	resendEmailOtpController
);

router.post(
	"/forgot-password",
	forgotPasswordIpRateLimiter,
	forgotPasswordEmailRateLimiter,
	forgotPasswordValidator,
	forgotPasswordController
);
router.post(
	"/reset-password",
	resetPasswordIpRateLimiter,
	resetPasswordEmailRateLimiter,
	resetPasswordValidator,
	resetPasswordController
);

export default router;
