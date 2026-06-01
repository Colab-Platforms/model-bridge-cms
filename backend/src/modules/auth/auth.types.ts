import type z from "zod";

import { loginSchema } from "./auth.validators.js";

export type LoginInput = z.infer<typeof loginSchema>;