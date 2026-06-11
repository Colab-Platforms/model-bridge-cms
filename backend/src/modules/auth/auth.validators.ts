import { z } from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

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

export const loginValidator = validateBody(loginSchema);
export const registerValidator = validateBody(registerSchema);
export const refreshValidator = validateBody(refreshSchema);
export const logoutValidator = validateBody(logoutSchema);
