import { Worker } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { scheduledJobsProcessor } from "../processors/scheduled-jobs.processor.js";
import { QUEUE_NAMES } from "../types/job-payloads.js";

const scheduledJobsWorker = new Worker(QUEUE_NAMES.SCHEDULED_JOBS, scheduledJobsProcessor, {
  connection: redisConnectionOptions,
  concurrency: 1,
});

scheduledJobsWorker.on("completed", (job) => {
  console.log(`[ScheduledJobs] Job ${job.id} completed (${job.data.jobName})`);
});

scheduledJobsWorker.on("failed", (job, err) => {
  console.error(
    `[ScheduledJobs] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
    err.message
  );
});

export default scheduledJobsWorker;
