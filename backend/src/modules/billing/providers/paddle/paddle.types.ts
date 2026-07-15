import type { EventEntity } from "@paddle/paddle-node-sdk";

export interface PaddleRuntimeConfig {
  apiKey: string;
  webhookSecret: string;
  environment: "sandbox" | "production";
}

export interface PaddleNormalizedWebhookEvent {
  event: EventEntity;
  eventId: string;
  notificationId: string | null;
  eventType: string;
  occurredAt: string;
}
