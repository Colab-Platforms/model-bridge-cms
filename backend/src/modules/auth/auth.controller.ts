import { Request, Response } from "express";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";
import { loginService, registerService, refreshService } from "./auth.service.js";
import type { LoginInput, RegisterInput, RefreshInput } from "./auth.types.js";

export const loginController = async (req: Request, res: Response) => {
	const body = req.body as LoginInput;
	const result = await loginService(body);

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
	const result = await registerService(body);

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
	const result = await refreshService(body.refreshToken);

	return sendResponse(res, true, result, "Token refreshed", STATUS_CODES.OK);
};