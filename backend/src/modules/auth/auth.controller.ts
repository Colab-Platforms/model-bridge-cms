import { Request, Response } from "express";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";
import type { LoginInput } from "./auth.types.js";

export const loginController = (req: Request, res: Response) => {
	const body = req.body as LoginInput;

	return sendResponse(
		res,
		true,
		{ email: body.email },
		"Login request accepted",
		STATUS_CODES.OK
	);
};