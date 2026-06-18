import { z } from "zod";

import { validateQuery } from "../../../shared/middlewares/validate.js";

export const adminOverviewDateRangePresetSchema = z.enum([
  "today",
  "past_24h",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

export const getAdminOverviewQuerySchema = z
  .object({
    dateRangePreset: adminOverviewDateRangePresetSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((value) => !(value.dateRangePreset === "custom" && !value.from && !value.to), {
    message: "Custom date range requires at least one of from or to",
    path: ["dateRangePreset"],
  });

export const getAdminOverviewQueryValidator = validateQuery(getAdminOverviewQuerySchema);
