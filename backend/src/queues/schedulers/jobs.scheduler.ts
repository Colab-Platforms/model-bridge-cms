import { scheduledJobsQueue } from "../queues/scheduled-jobs.queue.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

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

    console.log("[ScheduledJobs] Registered hourly low-balance check");
  } catch (error) {
    console.error("[ScheduledJobs] Failed to register scheduled jobs:", error);
  }
}
