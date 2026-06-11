import type z from "zod";

import { loginSchema, logoutSchema, registerSchema, refreshSchema } from "./auth.validators.js";

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
