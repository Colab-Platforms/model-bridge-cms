import { Queue } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { QUEUE_NAMES, type EmailJobPayload } from "../types/job-payloads.js";

export const emailQueue = new Queue<EmailJobPayload>(QUEUE_NAMES.EMAIL, {
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
