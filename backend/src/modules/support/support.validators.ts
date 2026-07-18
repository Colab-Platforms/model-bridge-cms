import { SupportTicketCategory } from "@prisma/client";
import { z } from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

export const createSupportTicketSchema = z.object({
  category: z.nativeEnum(SupportTicketCategory),
  subject: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(4000),
});

export const createSupportTicketValidator = validateBody(createSupportTicketSchema);
