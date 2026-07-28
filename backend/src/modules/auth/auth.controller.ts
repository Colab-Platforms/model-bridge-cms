import { Request, Response } from "express";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";
import {
	forgotPasswordService,
	googleCallbackService,
	getGoogleAuthorizationUrlService,
	loginService,
	logoutAllService,
	logoutService,
	refreshService,
	resendEmailOtpService,
	registerService,
	resetPasswordService,
	verifyEmailOtpService,
} from "./auth.service.js";
import type {
	ForgotPasswordInput,
	GoogleCallbackQueryInput,
	GoogleStartQueryInput,
	LoginInput,
	LogoutInput,
	ResendEmailOtpInput,
	RegisterInput,
	RefreshInput,
	ResetPasswordInput,
	VerifyEmailOtpInput,
} from "./auth.types.js";
import { buildFrontendGoogleCallbackUrl, verifyGoogleOAuthState } from "./auth.utils.js";

const getSessionContext = (req: Request) => ({
	deviceName: req.headers["x-device-name"]?.toString(),
	userAgent: req.headers["user-agent"],
	ipAddress: req.ip,
});

export const loginController = async (req: Request, res: Response) => {
	const body = req.body as LoginInput;
	const result = await loginService(body, getSessionContext(req));

	return sendResponse(
		res,
		true,
		result,
		"Login successful",
		STATUS_CODES.OK
	);
};

export const registerController = async (req: Request, res: Response) => {
	const body = req.body as RegisterInput;
	const result = await registerService(body, getSessionContext(req));

	return sendResponse(
		res,
		true,
		result,
		"User registered successfully",
		STATUS_CODES.CREATED
	);
};

export const refreshController = async (req: Request, res: Response) => {
	const body = req.body as RefreshInput;
	const result = await refreshService(body.refreshToken, getSessionContext(req));

	return sendResponse(res, true, result, "Token refreshed", STATUS_CODES.OK);
};

export const logoutController = async (req: Request, res: Response) => {
	const body = req.body as LogoutInput;
	const result = await logoutService(body.refreshToken);

	return sendResponse(res, true, result, "Logged out successfully", STATUS_CODES.OK);
};

export const logoutAllController = async (req: Request, res: Response) => {
	const user = (req as Request & { user?: { id?: string } }).user;
	const result = await logoutAllService(user?.id as string);

	return sendResponse(res, true, result, "Logged out from all sessions", STATUS_CODES.OK);
};

export const googleStartController = async (req: Request, res: Response) => {
	const query = req.query as GoogleStartQueryInput;
	const redirectUrl = getGoogleAuthorizationUrlService(query);

	return res.redirect(302, redirectUrl);
};

export const googleCallbackController = async (req: Request, res: Response) => {
	const query = req.query as GoogleCallbackQueryInput;

	try {
		const result = await googleCallbackService(query, getSessionContext(req));
		return res.redirect(302, result.redirectUrl);
	} catch (error) {
		const redirect =
			typeof query.state === "string"
				? (() => {
						try {
							return verifyGoogleOAuthState(query.state);
						} catch {
							return "/";
						}
				  })()
				: "/";
		const message = error instanceof Error ? error.message : "Google authentication failed";

		return res.redirect(
			302,
			buildFrontendGoogleCallbackUrl({
				error: message,
				redirect,
			})
		);
	}
};


export const verifyEmailOtpController = async (req: Request, res: Response) => {
	const body = req.body as VerifyEmailOtpInput;
	const result = await verifyEmailOtpService(body, getSessionContext(req));
	
	return sendResponse(res, true, result, "Email OTP verified successfully", STATUS_CODES.OK);
};

export const resendEmailOtpController = async (req: Request, res: Response) => {
	const body = req.body as ResendEmailOtpInput;
	const result = await resendEmailOtpService(body);

	return sendResponse(res, true, result, "Email OTP resent successfully", STATUS_CODES.OK);
};

export const forgotPasswordController = async (req: Request, res: Response) => {
	const body = req.body as ForgotPasswordInput;
	const result = await forgotPasswordService(body);

	return sendResponse(res, true, result, "Password reset OTP sent successfully", STATUS_CODES.OK);
};

export const resetPasswordController = async (req: Request, res: Response) => {
	const body = req.body as ResetPasswordInput;
	const result = await resetPasswordService(body, getSessionContext(req));

	return sendResponse(res, true, result, "Password reset successfully", STATUS_CODES.OK);
};
