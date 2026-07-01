// ─── Queue registry ───────────────────────────────────────────────────────────
// Queue instances — import from here to enqueue jobs anywhere in the app.
export { emailQueue } from "./queues/email.queue.js";
export { activityLogQueue } from "./queues/activity-log.queue.js";
// Phase 3: export { analyticsQueue } from "./queues/analytics.queue.js";
// Phase 3: export { usageAggregationQueue } from "./queues/usage-aggregation.queue.js";
// Phase 4: export { notificationQueue } from "./queues/notification.queue.js";
// Phase 4: export { webhookQueue } from "./queues/webhook.queue.js";
// Phase 4: export { providerSyncQueue } from "./queues/provider-sync.queue.js";
// Phase 5: export { retryQueue } from "./queues/retry.queue.js";
// Phase 5: export { billingReportQueue } from "./queues/billing-report.queue.js";
// Phase 5: export { scheduledJobsQueue } from "./queues/scheduled-jobs.queue.js";

export async function startWorkers(): Promise<void> {
  try {
    console.log("🚀 [BullMQ] Starting workers...");

    // Importing a worker file registers it with BullMQ automatically.
    await import("./workers/email.worker.js");
    await import("./workers/activity-log.worker.js");
    // Phase 3: await import("./workers/analytics.worker.js");
    // Phase 3: await import("./workers/usage-aggregation.worker.js");
    // Phase 4: await import("./workers/notification.worker.js");
    // Phase 4: await import("./workers/webhook.worker.js");
    // Phase 4: await import("./workers/provider-sync.worker.js");
    // Phase 5: await import("./workers/retry.worker.js");
    // Phase 5: await import("./workers/billing-report.worker.js");
    // Phase 5: await import("./workers/scheduled-jobs.worker.js");
    // Phase 5: await import("./schedulers/jobs.scheduler.js");

    console.log("✅ [BullMQ] All workers registered");
  } catch (err) {
    // Workers failing must not crash the HTTP server.
    console.error("❌ [BullMQ] Failed to start workers:", err);
  }
}
