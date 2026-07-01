import { Queue } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { QUEUE_NAMES, type ActivityLogJobPayload } from "../types/job-payloads.js";

export const activityLogQueue = new Queue<ActivityLogJobPayload>(QUEUE_NAMES.ACTIVITY_LOG, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 1000 },
  },
});
