import type { Job } from "bullmq";

import {
  runApiKeyExpiryCheck,
  runApiKeyLimitCheck,
} from "../../modules/api-keys/api-key-alerts.service.js";
import { runProviderLowBalanceCheck } from "../../modules/providers/provider-balance.service.js";
import { runWalletLowBalanceCheck } from "../../modules/wallets/wallet-alerts.service.js";
import type { ScheduledJobPayload } from "../types/job-payloads.js";

export async function scheduledJobsProcessor(job: Job<ScheduledJobPayload>): Promise<void> {
  switch (job.data.jobName) {
    case "low-balance-check":
      await runProviderLowBalanceCheck();
      return;
    case "api-key-expiry-check":
      await runApiKeyExpiryCheck();
      return;
    case "api-key-limit-check":
      await runApiKeyLimitCheck();
      return;
    case "wallet-low-balance-check":
      await runWalletLowBalanceCheck();
      return;
    default:
      console.warn(`[ScheduledJobs] Unsupported job: ${job.data.jobName}`);
  }
}
