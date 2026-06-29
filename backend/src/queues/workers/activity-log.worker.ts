import { Worker } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { activityLogProcessor } from "../processors/activity-log.processor.js";
import { QUEUE_NAMES } from "../types/job-payloads.js";

const activityLogWorker = new Worker(QUEUE_NAMES.ACTIVITY_LOG, activityLogProcessor, {
  connection: redisConnectionOptions,
  concurrency: 10,
});

activityLogWorker.on("completed", (job) => {
  console.log(`[ActivityLog] Job ${job.id} completed — type: ${job.data.activityType}`);
});

activityLogWorker.on("failed", (job, err) => {
  console.error(`[ActivityLog] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

export default activityLogWorker;
