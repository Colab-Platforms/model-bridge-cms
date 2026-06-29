import type { ActivityType } from "@prisma/client";

// ─── Queue name constants ─────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  EMAIL: "email",
  ACTIVITY_LOG: "activity-log",
  ANALYTICS: "analytics",
  USAGE_AGGREGATION: "usage-aggregation",
  NOTIFICATION: "notification",
  WEBHOOK: "webhook",
  PROVIDER_SYNC: "provider-sync",
  RETRY: "retry",
  BILLING_REPORT: "billing-report",
  SCHEDULED_JOBS: "scheduled-jobs",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Shared ───────────────────────────────────────────────────────────────────

export type AggregationGranularity = "daily" | "weekly" | "monthly";

export type BillingReportType = "monthly_summary" | "usage_export" | "invoice";

// ISO date strings — Date objects do not survive Redis JSON round-trip
export interface DateRange {
  from: string;
  to: string;
}

// ─── Phase 2 — Email ──────────────────────────────────────────────────────────
// Matches SendEmailInput in src/services/email.service.ts

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ─── Phase 2 — Activity Log ───────────────────────────────────────────────────
// Matches ActivityLogInput in src/services/activity-log.service.ts
// Only used outside Prisma transactions — inside transactions call the service directly.

export type ActivityEntityType =
  | "USER"
  | "PROJECT"
  | "API_KEY"
  | "WALLET"
  | "MODEL"
  | "PROVIDER"
  | "AUTH"
  | "SYSTEM";

export interface ActivityLogJobPayload {
  activityType: ActivityType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  actorId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ─── Phase 3 — Analytics ─────────────────────────────────────────────────────

export interface AnalyticsJobPayload {
  inferenceRequestId: string;
  userId: string;
  projectId: string;
  apiKeyId: string;
  modelId: string;
  providerSlug: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  timestamp: string; // ISO date string
}

// ─── Phase 3 — Usage Aggregation ─────────────────────────────────────────────

export interface UsageAggregationJobPayload {
  date: string; // ISO date string e.g. "2026-06-29"
  granularity: AggregationGranularity;
}

// ─── Phase 4 — Notification ───────────────────────────────────────────────────

export type NotificationType =
  | "LOW_BALANCE"
  | "KEY_EXPIRY"
  | "KEY_REVOKED"
  | "INFERENCE_FAILED"
  | "USAGE_LIMIT_REACHED"
  | "PROVIDER_DEGRADED"
  | "REPORT_READY"
  | "SYSTEM";

export interface NotificationJobPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── Phase 4 — Webhook ────────────────────────────────────────────────────────
// targetUrl and secret are fetched from DB in the processor using webhookId
// to avoid storing sensitive data in Redis job records.

export type WebhookEventType =
  | "inference.completed"
  | "inference.failed"
  | "usage.limit_reached"
  | "balance.low"
  | "apikey.created"
  | "apikey.revoked"
  | "provider.degraded";

export interface WebhookJobPayload {
  webhookId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
}

// ─── Phase 4 — Provider Sync ──────────────────────────────────────────────────
// Anthropic excluded — no public model listing API.

export type SyncableProviderSlug = "openai" | "gemini" | "groq";

export interface ProviderSyncJobPayload {
  providerSlug: SyncableProviderSlug;
}

// ─── Phase 5 — Retry ──────────────────────────────────────────────────────────

export interface RetryJobPayload {
  inferenceRequestId: string;
  userId: string;
  projectId: string;
  apiKeyId: string;
  modelSlug: string;
  requestBody: Record<string, unknown>;
  attemptNumber: number;
}

// ─── Phase 5 — Billing Report ─────────────────────────────────────────────────

export interface BillingReportJobPayload {
  userId: string;
  reportType: BillingReportType;
  dateRange: DateRange;
}

// ─── Phase 5 — Scheduled Jobs ─────────────────────────────────────────────────

export type ScheduledJobName =
  | "daily-usage-aggregation"
  | "weekly-usage-aggregation"
  | "monthly-usage-aggregation"
  | "provider-sync-openai"
  | "provider-sync-gemini"
  | "provider-sync-groq"
  | "api-key-expiry-check"
  | "low-balance-check";

export interface ScheduledJobPayload {
  jobName: ScheduledJobName;
  params?: Record<string, unknown>;
}
