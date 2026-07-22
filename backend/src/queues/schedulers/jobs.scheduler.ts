import { scheduledJobsQueue } from "../queues/scheduled-jobs.queue.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export async function registerScheduledJobs(): Promise<void> {
  try {
    await scheduledJobsQueue.upsertJobScheduler(
      "low-balance-check-hourly",
      {
        every: ONE_HOUR_MS,
      },
      {
        name: "low-balance-check",
        data: {
          jobName: "low-balance-check",
        },
      }
    );

    // Expiry dates don't need sub-day precision, so a daily sweep is enough.
    await scheduledJobsQueue.upsertJobScheduler(
      "api-key-expiry-check-daily",
      {
        every: TWENTY_FOUR_HOURS_MS,
      },
      {
        name: "api-key-expiry-check",
        data: {
          jobName: "api-key-expiry-check",
        },
      }
    );

    // Usage accrues continuously, so this runs more often than the expiry check to
    // catch the 80% threshold promptly.
    await scheduledJobsQueue.upsertJobScheduler(
      "api-key-limit-check-15min",
      {
        every: FIFTEEN_MINUTES_MS,
      },
      {
        name: "api-key-limit-check",
        data: {
          jobName: "api-key-limit-check",
        },
      }
    );

    // Backstop only — the real-time hook in updateWalletBalanceWithTransaction
    // (wallets.service.ts) already sends/resolves on every balance change. Reusing
    // the provider-balance interval since this is purely a safety net, not the
    // primary alerting path (unlike provider balance, where the sweep does the
    // actual sending).
    await scheduledJobsQueue.upsertJobScheduler(
      "wallet-low-balance-check-hourly",
      {
        every: ONE_HOUR_MS,
      },
      {
        name: "wallet-low-balance-check",
        data: {
          jobName: "wallet-low-balance-check",
        },
      }
    );

    console.log(
      "[ScheduledJobs] Registered hourly low-balance check, daily api-key expiry check, 15-minute api-key limit check, and hourly wallet low-balance check"
    );
  } catch (error) {
    console.error("[ScheduledJobs] Failed to register scheduled jobs:", error);
  }
}
