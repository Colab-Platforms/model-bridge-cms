/**
 * BullMQ smoke test — run with:
 *   npx tsx src/queues/queue.test.ts
 *
 * Tests: Redis connection → enqueue email job → worker processes it → exit.
 * In development, email falls back to console.log (no Resend key needed).
 */

import "dotenv/config";

import IORedis from "ioredis";
import { Worker } from "bullmq";

import { redisConnectionOptions } from "./connections/ioredis.js";
import { emailQueue } from "./queues/email.queue.js";
import { emailProcessor } from "./processors/email.processor.js";
import { QUEUE_NAMES } from "./types/job-payloads.js";

const TIMEOUT_MS = 15_000;

async function main() {
  console.log("\n=== BullMQ Smoke Test ===\n");

  // ── Step 1: Verify Redis connection ────────────────────────────────────────
  console.log("1. Testing Redis connection...");
  const probe = new IORedis(redisConnectionOptions);

  try {
    const pong = await probe.ping();
    if (pong !== "PONG") throw new Error(`Unexpected ping response: ${pong}`);
    console.log("   ✅ Redis connected\n");
  } catch (err) {
    console.error("   ❌ Redis connection failed:", (err as Error).message);
    console.error("\n   Fix: set REDIS_URL in .env to a valid Redis connection string.");
    console.error("   Upstash native URL format: rediss://default:<token>@<host>.upstash.io:6379\n");
    await probe.quit();
    process.exit(1);
  } finally {
    await probe.quit();
  }

  // ── Step 2: Start email worker ─────────────────────────────────────────────
  console.log("2. Starting email worker...");
  const worker = new Worker(QUEUE_NAMES.EMAIL, emailProcessor, {
    connection: redisConnectionOptions,
    concurrency: 1,
  });
  console.log("   ✅ Worker registered\n");

  // ── Step 3: Enqueue a test job ─────────────────────────────────────────────
  console.log("3. Enqueueing test email job...");
  const job = await emailQueue.add("smoke-test", {
    to: "test@example.com",
    subject: "BullMQ Smoke Test",
    html: "<p>BullMQ is working.</p>",
    text: "BullMQ is working.",
  });
  console.log(`   ✅ Job enqueued (id: ${job.id})\n`);

  // ── Step 4: Wait for the worker to process it ──────────────────────────────
  console.log("4. Waiting for worker to process job...");

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Job not processed within ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    worker.on("completed", (completedJob) => {
      if (completedJob.id === job.id) {
        clearTimeout(timer);
        console.log("   ✅ Job processed successfully\n");
        resolve();
      }
    });

    worker.on("failed", (failedJob, err) => {
      if (failedJob?.id === job.id) {
        clearTimeout(timer);
        reject(new Error(`Job failed: ${err.message}`));
      }
    });
  });

  // ── Step 5: Clean up ───────────────────────────────────────────────────────
  await worker.close();
  await emailQueue.close();

  console.log("=== ✅ All tests passed — BullMQ is working correctly ===\n");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("\n=== ❌ Smoke test failed ===");
  console.error((err as Error).message, "\n");
  process.exit(1);
});
