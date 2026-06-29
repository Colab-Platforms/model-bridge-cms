import { Worker } from "bullmq";

import { redisConnectionOptions } from "../connections/ioredis.js";
import { emailProcessor } from "../processors/email.processor.js";
import { QUEUE_NAMES } from "../types/job-payloads.js";

const emailWorker = new Worker(QUEUE_NAMES.EMAIL, emailProcessor, {
  connection: redisConnectionOptions,
  concurrency: 5,
});

emailWorker.on("completed", (job) => {
  console.log(`[Email] Job ${job.id} completed — sent to ${job.data.to}`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Email] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

export default emailWorker;
