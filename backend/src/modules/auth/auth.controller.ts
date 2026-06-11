import { Request, Response } from "express";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";
import {
	loginService,
	logoutAllService,
	logoutService,
	refreshService,
	registerService,
} from "./auth.service.js";
import type { LoginInput, LogoutInput, RegisterInput, RefreshInput } from "./auth.types.js";

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
