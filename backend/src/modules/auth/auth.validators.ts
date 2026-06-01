import z from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginValidator = validateBody(loginSchema);