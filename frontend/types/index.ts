export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type ApiKeyStatus = "ACTIVE" | "REVOKED" | "INACTIVE" | "EXPIRED" | "EXHAUSTED";
export type LimitType = "UNLIMITED" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUATERLY" | "YEARLY";
export type RequestStatus = "SUCCESS" | "FAILED" | "PARTIAL" | "STOPPED";
export type TransactionType =
  | "TOPUP"
  | "CREDIT_GRANT"
  | "USAGE_DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

export interface Project {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthProvider = "LOCAL" | "GOOGLE" | "GITHUB";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  creditBalance: number;
  createdAt: string;
  phoneNo?: string;
  countryCode?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImage?: string;
  timezone?: string;
  authProvider?: AuthProvider;
}

export interface Session {
  id: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt?: string;
  expiresAt: string;
  absoluteExpiresAt?: string;
  revokedAt?: string | null;
  createdAt: string;
  isCurrent?: boolean;
}

export interface ApiKey {
  id: string;
  projectId: string;
  keyPrefix: string;
  name: string;
  status: ApiKeyStatus;
  creditLimit?: string;
  limitType?: LimitType;
  lastUsedAt?: string;
  createdAt: string;
}

export type CapabilityType =
  | "TEXT"
  | "IMAGE"
  | "EMBEDDING"
  | "AUDIO"
  | "VIDEO"
  | "SPEECH"
  | "RESEARCH";

export interface ModelProvider {
  id: string;
  slug: string;
  displayName: string;
  providerLogo: string | null;
}

export interface Model {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  parameterCount: string | null;
  contextLength: number | null;
  inputModalities: string[];
  outputModalities: string[];
  inputPricePerToken?: string;
  outputPricePerToken?: string;
  inputPricePer1m: string;       // computed = inputPricePerToken × 1,000,000
  outputPricePer1m: string;      // computed = outputPricePerToken × 1,000,000
  pricePerImage: string | null;
  isActive: boolean;
  releaseDate: string | null;
  createdAt: string;
  defaultForCapabilities: string[];
  provider: ModelProvider;

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
  amount: string;
  balanceBefore?: string;
  balanceAfter?: string;
  description?: string;
  createdAt: string;
}

export interface ModelFilters {
  q?: string;
  providerId?: string[];
  capability?: CapabilityType[];
  isActive?: boolean;
  minContext?: number;
  maxContext?: number;
  maxInputPrice?: number;
  maxOutputPrice?: number;
  sort?:
  | "newest"
  | "price_input_asc"
  | "price_input_desc"
  | "price_output_asc"
  | "price_output_desc"
  | "context_asc"
  | "context_desc"
  | "name_asc";
  inputModality?: string[];
  outputModality?: string[];
  page?: number;
  pageSize?: number;
}

export interface PaginatedModels {
  data: Model[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ModelUsageStats {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: string;
  lastUsedAt: string | null;
}

// ── Billing ────────────────────────────────────────────────────────────────────

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";
export type InvoiceStatus = "PENDING" | "ISSUED" | "PAID" | "VOID";
export type BillingProvider = "PADDLE" | "DODO" | "STRIPE" | "RAZORPAY" | "LEMON_SQUEEZY";

export interface Payment {
  id: string;
  userId: string;
  walletId: string;
  provider: BillingProvider;
  providerTransactionId: string;
  providerCustomerId: string | null;
  invoiceId: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  paymentId: string;
  userId: string;
  providerInvoiceId: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  payment: Payment;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
