import type z from "zod";

import {
  getUsageLogsQuerySchema,
  getUsageSummaryQuerySchema,
  getUsageTimeseriesQuerySchema,
} from "./usage.validators.js";

export type UsageActor = {
  id: string;
  roles: string[];
};

export type GetUsageLogsQuery = z.infer<typeof getUsageLogsQuerySchema>;
export type GetUsageSummaryQuery = z.infer<typeof getUsageSummaryQuerySchema>;
export type GetUsageTimeseriesQuery = z.infer<typeof getUsageTimeseriesQuerySchema>;
