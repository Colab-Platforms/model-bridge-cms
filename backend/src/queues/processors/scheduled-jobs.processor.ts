import type { Job } from "bullmq";

import { runProviderLowBalanceCheck } from "../../modules/providers/provider-balance.service.js";
import type { ScheduledJobPayload } from "../types/job-payloads.js";

export async function scheduledJobsProcessor(job: Job<ScheduledJobPayload>): Promise<void> {
  switch (job.data.jobName) {
    case "low-balance-check":
      await runProviderLowBalanceCheck();
      return;
    default:
      console.warn(`[ScheduledJobs] Unsupported job: ${job.data.jobName}`);
  }
}
