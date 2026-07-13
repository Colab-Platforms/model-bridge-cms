import { Queue } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { QUEUE_NAMES, type ScheduledJobPayload } from "../types/job-payloads.js";

export const scheduledJobsQueue = new Queue<ScheduledJobPayload>(QUEUE_NAMES.SCHEDULED_JOBS, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
