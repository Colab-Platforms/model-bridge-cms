import { SupportTicketCategory, SupportTicketStatus } from "@prisma/client";
import { z } from "zod";

import { validateBody, validateParams, validateQuery } from "../../../shared/middlewares/validate.js";

export const adminSupportTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(SupportTicketStatus).optional(),
  category: z.nativeEnum(SupportTicketCategory).optional(),
});

export const adminSupportTicketIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const updateAdminSupportTicketStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus),
});

export const adminSupportTicketsQueryValidator = validateQuery(adminSupportTicketsQuerySchema);
export const adminSupportTicketIdParamsValidator = validateParams(adminSupportTicketIdParamsSchema);
export const updateAdminSupportTicketStatusValidator = validateBody(updateAdminSupportTicketStatusSchema);
