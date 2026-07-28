import type z from "zod";

import {
	googleCallbackQuerySchema,
	googleStartQuerySchema,
	loginSchema,
	logoutSchema,
	registerSchema,
	resendEmailOtpSchema,
	refreshSchema,
	verifyEmailOtpSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
} from "./auth.validators.js";

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type GoogleStartQueryInput = z.infer<typeof googleStartQuerySchema>;
export type GoogleCallbackQueryInput = z.infer<typeof googleCallbackQuerySchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type ResendEmailOtpInput = z.infer<typeof resendEmailOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
