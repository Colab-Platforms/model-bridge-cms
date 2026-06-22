import { z } from "zod";

import { validateBody, validateQuery } from "../../shared/middlewares/validate.js";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phoneNo: z.string().trim().min(1).optional(),
  countryCode: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).optional(),
  profileImage: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const googleStartQuerySchema = z.object({
  redirect: z.string().trim().max(2048).optional(),
});

export const googleCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  error: z.string().trim().min(1).optional(),
  error_description: z.string().trim().min(1).optional(),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().length(6),
});

export const resendEmailOtpSchema = z.object({
  email: z.string().trim().email(),
});

export const resendEmailOtpValidator = validateBody(resendEmailOtpSchema);
export const verifyEmailOtpValidator = validateBody(verifyEmailOtpSchema);

export const loginValidator = validateBody(loginSchema);
export const registerValidator = validateBody(registerSchema);
export const refreshValidator = validateBody(refreshSchema);
export const logoutValidator = validateBody(logoutSchema);
export const googleStartValidator = validateQuery(googleStartQuerySchema);
export const googleCallbackValidator = validateQuery(googleCallbackQuerySchema);
