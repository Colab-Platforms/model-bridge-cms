export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type ApiKeyStatus = "ACTIVE" | "REVOKED" | "EXPIRED";
export type ApiKeyScope = "FULL" | "CHAT" | "IMAGE" | "AUDIO" | "VIDEO" | "READ_ONLY";
export type RequestStatus = "PENDING" | "SUCCESS" | "FAILED" | "PARTIAL";
export type TransactionType =
  | "CREDIT_PURCHASE"
  | "CREDIT_GRANT"
  | "USAGE_DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  creditBalance: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  status: ApiKeyStatus;
  scopes: ApiKeyScope[];
  rateLimit: number;
  monthlyLimit?: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface Model {
  id: string;
  slug: string;
  displayName: string;
  providerId: string;
  provider: { slug: string; displayName: string };
  capabilities: string[];
  contextWindow: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  isActive: boolean;
}

export interface UsageLog {
  id: string;
  requestId: string;
  modelId: string;
  model: Model;
  apiKeyId: string;
  apiKey: { keyPrefix: string };
  capability: string;
  status: RequestStatus;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  type: TransactionType;
  amountUsd: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}