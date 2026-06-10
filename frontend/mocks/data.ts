// ── Providers (internal) ──────────────────────────────────────────────────────
const P_OPENAI = { id: "prv_01", slug: "openai", displayName: "OpenAI" };
const P_ANTHROPIC = { id: "prv_02", slug: "anthropic", displayName: "Anthropic" };
const P_GOOGLE = { id: "prv_03", slug: "google", displayName: "Google" };
const P_META = { id: "prv_04", slug: "meta", displayName: "Meta" };

// ── User ──────────────────────────────────────────────────────────────────────
export const mockUser = {
  id: "usr_01",
  email: "dev@modelbridge.io",
  firstName: "Alex",
  lastName: "Chen",
  role: "USER" as const,
  status: "ACTIVE" as const,
  creditBalance: 48.50,
  createdAt: "2026-01-01T00:00:00Z",
  city: "San Francisco",
  state: "California",
  country: "United States",
  timezone: "America/Los_Angeles",
  authProvider: "LOCAL" as const,
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const mockProjects = [
  {
    id: "proj_01",
    name: "Personal",
    slug: "personal",
    description: "Personal experiments and side projects",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "proj_02",
    name: "Startup App",
    slug: "startup-app",
    description: "Production application",
    isActive: true,
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

// ── API Keys ──────────────────────────────────────────────────────────────────
export const mockApiKeys = [
  { id: "key_01", projectId: "proj_01", keyPrefix: "mb-sk-abc12", name: "Production", status: "ACTIVE", creditLimit: "50.00", limitType: "MONTHLY", lastUsedAt: "2026-06-08T09:30:00Z", createdAt: "2026-01-20T10:00:00Z" },
  { id: "key_02", projectId: "proj_01", keyPrefix: "mb-sk-def34", name: "Development", status: "ACTIVE", creditLimit: null, limitType: null, lastUsedAt: "2026-06-07T14:00:00Z", createdAt: "2026-02-10T10:00:00Z" },
  { id: "key_03", projectId: "proj_01", keyPrefix: "mb-sk-ghi56", name: "CI Testing", status: "REVOKED", creditLimit: "5.00", limitType: "DAILY", lastUsedAt: "2026-05-01T10:00:00Z", createdAt: "2026-03-05T10:00:00Z" },
  { id: "key_04", projectId: "proj_02", keyPrefix: "mb-sk-jkl78", name: "Prod v2", status: "ACTIVE", creditLimit: "200.00", limitType: "MONTHLY", lastUsedAt: "2026-06-08T07:00:00Z", createdAt: "2026-02-28T10:00:00Z" },
  { id: "key_05", projectId: "proj_02", keyPrefix: "mb-sk-mno90", name: "Staging", status: "INACTIVE", creditLimit: "10.00", limitType: "WEEKLY", lastUsedAt: null, createdAt: "2026-04-01T10:00:00Z" },
];

// ── Models ────────────────────────────────────────────────────────────────────
export const mockModels = [
  {
    id: "mdl_01", slug: "gpt-4o", displayName: "GPT-4o",
    description: "OpenAI's flagship multimodal model with vision and function calling.",
    contextLength: 128000, maxOutputTokens: 16384,
    // gpt-4o
    inputModalities: ["text", "image"], outputModalities: ["text"],
    inputPricePer1m: "2.500000", outputPricePer1m: "10.000000",
    pricePerImage: null, parameterCount: null, releaseDate: "2024-05-13",
    defaultForCapabilities: ["TEXT", "IMAGE"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_OPENAI,
  },
  {
    id: "mdl_02", slug: "gpt-4o-mini", displayName: "GPT-4o mini",
    description: "Fast, affordable small model for lightweight tasks.",
    contextLength: 128000, maxOutputTokens: 16384,
    // gpt-4o-mini, llama models
    inputModalities: ["text"], outputModalities: ["text"],
    inputPricePer1m: "0.150000", outputPricePer1m: "0.600000",
    pricePerImage: null, parameterCount: null, releaseDate: "2024-07-18",
    defaultForCapabilities: ["TEXT"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_OPENAI,
  },
  {
    id: "mdl_03", slug: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6",
    description: "Anthropic's most intelligent model with extended thinking and vision.",
    contextLength: 200000, maxOutputTokens: 8096,
    // claude models
    inputModalities: ["text", "image"], outputModalities: ["text"],
    inputPricePer1m: "3.000000", outputPricePer1m: "15.000000",
    pricePerImage: null, parameterCount: null, releaseDate: "2025-07-22",
    defaultForCapabilities: ["TEXT", "RESEARCH"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_ANTHROPIC,
  },
  {
    id: "mdl_04", slug: "claude-haiku-4-5", displayName: "Claude Haiku 4.5",
    description: "Fast, compact model for near-instant responsiveness.",
    contextLength: 200000, maxOutputTokens: 8096,
    inputModalities: ["text", "image"],  outputModalities: ["text"],
    inputPricePer1m: "0.800000", outputPricePer1m: "4.000000",
    pricePerImage: null, parameterCount: null, releaseDate: "2025-10-01",
    defaultForCapabilities: ["TEXT"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_ANTHROPIC,
  },
  {
    id: "mdl_05", slug: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro",
    description: "Google's state-of-the-art model with a 2M context window.",
    contextLength: 2000000, maxOutputTokens: 8192,
    // gemini models
    inputModalities: ["text", "image", "audio", "video"], outputModalities: ["text"],
    inputPricePer1m: "3.500000", outputPricePer1m: "10.500000",
    pricePerImage: null, parameterCount: null, releaseDate: "2024-02-15",
    defaultForCapabilities: ["TEXT", "RESEARCH"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_GOOGLE,
  },
  {
    id: "mdl_06", slug: "gemini-flash-1.5", displayName: "Gemini Flash 1.5",
    description: "Lightweight, cost-efficient model from Google.",
    inputModalities: ["text", "image", "audio", "video"],  outputModalities: ["text"],
    contextLength: 1000000, maxOutputTokens: 8192,
    inputPricePer1m: "0.075000", outputPricePer1m: "0.300000",
    pricePerImage: null, parameterCount: null, releaseDate: "2024-05-14",
    defaultForCapabilities: ["TEXT"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_GOOGLE,
  },
  {
    id: "mdl_07", slug: "llama-3.3-70b", displayName: "Llama 3.3 70B",
    description: "Meta's powerful open-weight model for complex reasoning.",
    contextLength: 128000, maxOutputTokens: 32768,
    inputModalities: ["text"],  outputModalities: ["text"],
    inputPricePer1m: "0.350000", outputPricePer1m: "0.400000",
    pricePerImage: null, parameterCount: "70B", releaseDate: "2024-12-06",
    defaultForCapabilities: ["TEXT"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_META,
  },
  {
    id: "mdl_08", slug: "llama-3.1-8b", displayName: "Llama 3.1 8B",
    description: "Meta's efficient small model for high-throughput applications.",
    contextLength: 128000, maxOutputTokens: 32768,
    inputModalities: ["text"],  outputModalities: ["text"],
    inputPricePer1m: "0.050000", outputPricePer1m: "0.080000",
    pricePerImage: null, parameterCount: "8B", releaseDate: "2024-07-23",
    defaultForCapabilities: ["TEXT"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_META,
  },
  {
    id: "mdl_09", slug: "dall-e-3", displayName: "DALL-E 3",
    description: "OpenAI's image generation model with superior prompt following.",
    contextLength: null, maxOutputTokens: null,
    // dall-e-3
    inputModalities: ["text"], outputModalities: ["image"],
    inputPricePer1m: "0.000000", outputPricePer1m: "0.000000",
    pricePerImage: "0.040000", parameterCount: null, releaseDate: "2023-10-01",
    defaultForCapabilities: ["IMAGE"],
    isActive: true, createdAt: "2026-01-01T00:00:00Z", provider: P_OPENAI,
  },
];

// ── Usage Logs ────────────────────────────────────────────────────────────────
const LOG_MODELS = [
  { model: "gpt-4o", apiKeyPrefix: "mb-sk-abc12" },
  { model: "claude-sonnet-4-6", apiKeyPrefix: "mb-sk-def34" },
  { model: "gpt-4o-mini", apiKeyPrefix: "mb-sk-jkl78" },
  { model: "gemini-flash-1.5", apiKeyPrefix: "mb-sk-jkl78" },
  { model: "llama-3.1-8b", apiKeyPrefix: "mb-sk-def34" },
];
const LOG_STATUSES = ["SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "FAILED", "PARTIAL", "SUCCESS", "SUCCESS", "STOPPED", "SUCCESS"] as const;
const LOG_CAPS = ["CHAT", "STREAMING", "FUNCTION_CALLING", "VISION", "CHAT", "CHAT", "STREAMING", "CHAT", "FUNCTION_CALLING", "CHAT"];
const PROMPT_T = [512, 1024, 2048, 4096, 256, 768, 3000, 150, 8000, 2500];
const COMPL_T = [128, 512, 1024, 256, 0, 384, 750, 64, 2000, 600];
const LATENCY_MS = [450, 1200, 2800, 980, 3200, 750, 1580, 320, 4200, 1100];

export const mockUsageLogs = Array.from({ length: 30 }, (_, i) => {
  const mk = LOG_MODELS[i % LOG_MODELS.length];
  const status = LOG_STATUSES[i % LOG_STATUSES.length];
  const pTok = PROMPT_T[i % 10];
  const cTok = status === "FAILED" ? 0 : COMPL_T[i % 10];
  const total = pTok + cTok;
  const d = new Date("2026-06-08T12:00:00Z");
  d.setHours(d.getHours() - i * 3);
  return {
    id: `log_${String(i + 1).padStart(3, "0")}`,
    requestId: `req_${i.toString(16).padStart(8, "0")}`,
    timestamp: d.toISOString(),
    model: mk.model,
    apiKeyPrefix: mk.apiKeyPrefix,
    capability: LOG_CAPS[i % LOG_CAPS.length],
    status,
    promptTokens: pTok,
    completionTokens: cTok,
    totalTokens: total,
    costUsd: (total / 1_000_000 * 3.0).toFixed(6),
    latencyMs: LATENCY_MS[i % 10],
    finishReason: status === "FAILED" ? "error" : "stop",
    errorMessage: status === "FAILED" ? "Rate limit exceeded" : undefined,
    providerCost: (total / 1_000_000 * 2.5).toFixed(6),
    platformMarkupPercent: "20.00",
    platformMarkup: (total / 1_000_000 * 0.5).toFixed(6),
    requestPayload: { model: mk.model, messages: [{ role: "user", content: "Hello, how are you?" }] },
    responseMetadata: { usage: { prompt_tokens: pTok, completion_tokens: cTok } },
  };
});

// ── Stats ─────────────────────────────────────────────────────────────────────
export const mockStats = {
  summary: {
    totalRequests: 1247,
    successfulRequests: 1189,
    totalTokens: 4_850_000,
    totalSpendUsd: 24.35,
    avgLatencyMs: 1823,
  },
  dailySpend: Array.from({ length: 30 }, (_, i) => {
    const d = new Date("2026-06-08");
    d.setDate(d.getDate() - (29 - i));
    const costs = [0.42, 0.88, 1.20, 0.65, 1.85, 2.10, 0.95, 1.30, 0.72, 2.40, 1.15, 0.58, 1.90, 2.25, 0.83, 1.45, 0.67, 2.80, 1.60, 0.94, 1.35, 2.05, 0.77, 1.75, 0.52, 2.30, 1.00, 1.55, 0.89, 1.20];
    return { date: d.toISOString().split("T")[0], costUsd: costs[i] };
  }),
  modelBreakdown: [
    { model: "gpt-4o", requestCount: 412, totalTokens: 1_850_000, totalCostUsd: 10.25 },
    { model: "claude-sonnet-4-6", requestCount: 388, totalTokens: 1_540_000, totalCostUsd: 8.80 },
    { model: "gpt-4o-mini", requestCount: 280, totalTokens: 920_000, totalCostUsd: 3.50 },
    { model: "gemini-flash-1.5", requestCount: 167, totalTokens: 540_000, totalCostUsd: 1.80 },
  ],
  keyBreakdown: [
    { keyPrefix: "mb-sk-abc12", requestCount: 520, totalCostUsd: 12.80 },
    { keyPrefix: "mb-sk-def34", requestCount: 380, totalCostUsd: 7.20 },
    { keyPrefix: "mb-sk-jkl78", requestCount: 347, totalCostUsd: 4.35 },
  ],
};

// ── Credits ───────────────────────────────────────────────────────────────────
export const mockCreditBalance = { balance: "48.50" };

export const mockTransactions = [
  { id: "txn_01", type: "TOPUP", amount: "50.00", balanceBefore: "0.00", balanceAfter: "50.00", description: "Initial top-up via Stripe", createdAt: "2026-01-15T10:00:00Z" },
  { id: "txn_02", type: "CREDIT_GRANT", amount: "5.00", balanceBefore: "50.00", balanceAfter: "55.00", description: "Welcome credit grant", createdAt: "2026-01-15T10:01:00Z" },
  { id: "txn_03", type: "USAGE_DEDUCTION", amount: "1.24", balanceBefore: "55.00", balanceAfter: "53.76", description: "API usage — proj_01", createdAt: "2026-02-01T14:30:00Z" },
  { id: "txn_04", type: "USAGE_DEDUCTION", amount: "0.87", balanceBefore: "53.76", balanceAfter: "52.89", description: "API usage — proj_01", createdAt: "2026-02-05T09:15:00Z" },
  { id: "txn_05", type: "TOPUP", amount: "20.00", balanceBefore: "52.89", balanceAfter: "72.89", description: "Top-up via Stripe", createdAt: "2026-02-10T11:00:00Z" },
  { id: "txn_06", type: "USAGE_DEDUCTION", amount: "3.45", balanceBefore: "72.89", balanceAfter: "69.44", description: "API usage — proj_02", createdAt: "2026-02-14T16:20:00Z" },
  { id: "txn_07", type: "REFUND", amount: "0.87", balanceBefore: "69.44", balanceAfter: "70.31", description: "Refund for failed requests", createdAt: "2026-02-15T08:00:00Z" },
  { id: "txn_08", type: "USAGE_DEDUCTION", amount: "2.10", balanceBefore: "70.31", balanceAfter: "68.21", description: "API usage — proj_01", createdAt: "2026-03-01T13:45:00Z" },
  { id: "txn_09", type: "USAGE_DEDUCTION", amount: "5.82", balanceBefore: "68.21", balanceAfter: "62.39", description: "API usage — proj_02", createdAt: "2026-03-10T17:30:00Z" },
  { id: "txn_10", type: "TOPUP", amount: "50.00", balanceBefore: "62.39", balanceAfter: "112.39", description: "Top-up via Stripe", createdAt: "2026-03-15T10:00:00Z" },
  { id: "txn_11", type: "USAGE_DEDUCTION", amount: "8.34", balanceBefore: "112.39", balanceAfter: "104.05", description: "API usage — proj_02", createdAt: "2026-04-01T12:00:00Z" },
  { id: "txn_12", type: "ADJUSTMENT", amount: "2.00", balanceBefore: "104.05", balanceAfter: "106.05", description: "Manual credit adjustment", createdAt: "2026-04-05T09:00:00Z" },
  { id: "txn_13", type: "USAGE_DEDUCTION", amount: "12.75", balanceBefore: "106.05", balanceAfter: "93.30", description: "API usage — proj_01", createdAt: "2026-04-15T18:30:00Z" },
  { id: "txn_14", type: "USAGE_DEDUCTION", amount: "9.60", balanceBefore: "93.30", balanceAfter: "83.70", description: "API usage — proj_02", createdAt: "2026-05-01T11:15:00Z" },
  { id: "txn_15", type: "TOPUP", amount: "20.00", balanceBefore: "83.70", balanceAfter: "103.70", description: "Top-up via Stripe", createdAt: "2026-05-10T10:00:00Z" },
  { id: "txn_16", type: "USAGE_DEDUCTION", amount: "18.45", balanceBefore: "103.70", balanceAfter: "85.25", description: "API usage — proj_01 & proj_02", createdAt: "2026-05-20T14:00:00Z" },
  { id: "txn_17", type: "USAGE_DEDUCTION", amount: "15.30", balanceBefore: "85.25", balanceAfter: "69.95", description: "API usage — proj_02", createdAt: "2026-06-01T09:30:00Z" },
  { id: "txn_18", type: "REFUND", amount: "1.55", balanceBefore: "69.95", balanceAfter: "71.50", description: "Refund for failed requests", createdAt: "2026-06-02T08:00:00Z" },
  { id: "txn_19", type: "USAGE_DEDUCTION", amount: "11.20", balanceBefore: "71.50", balanceAfter: "60.30", description: "API usage — proj_01", createdAt: "2026-06-05T16:45:00Z" },
  { id: "txn_20", type: "USAGE_DEDUCTION", amount: "11.80", balanceBefore: "60.30", balanceAfter: "48.50", description: "API usage — proj_02", createdAt: "2026-06-08T08:00:00Z" },
];

// ── Activity Logs ─────────────────────────────────────────────────────────────
export const mockActivity = [
  { id: "act_01", activityType: "USER_LOGIN", entityType: null, entityId: null, metadata: { device: "Chrome on macOS" }, ipAddress: "192.168.1.1", createdAt: "2026-06-08T09:00:00Z" },
  { id: "act_02", activityType: "API_KEY_CREATED", entityType: "ApiKey", entityId: "key_04", metadata: { keyName: "Prod v2" }, ipAddress: "192.168.1.1", createdAt: "2026-06-07T14:30:00Z" },
  { id: "act_03", activityType: "PROJECT_UPDATED", entityType: "Project", entityId: "proj_02", metadata: { field: "description" }, ipAddress: "192.168.1.1", createdAt: "2026-06-06T11:00:00Z" },
  { id: "act_04", activityType: "WALLET_TOPUP", entityType: null, entityId: null, metadata: { amount: "20.00", currency: "USD" }, ipAddress: "192.168.1.1", createdAt: "2026-06-05T10:00:00Z" },
  { id: "act_05", activityType: "API_KEY_UPDATED", entityType: "ApiKey", entityId: "key_01", metadata: { field: "creditLimit", value: "50.00" }, ipAddress: "10.0.0.45", createdAt: "2026-06-04T16:00:00Z" },
  { id: "act_06", activityType: "USER_LOGOUT", entityType: null, entityId: null, metadata: null, ipAddress: "10.0.0.45", createdAt: "2026-06-03T18:00:00Z" },
  { id: "act_07", activityType: "USER_LOGIN", entityType: null, entityId: null, metadata: { device: "Mobile Safari" }, ipAddress: "10.0.0.45", createdAt: "2026-06-03T09:00:00Z" },
  { id: "act_08", activityType: "API_KEY_REVOKED", entityType: "ApiKey", entityId: "key_03", metadata: { keyName: "CI Testing" }, ipAddress: "192.168.1.1", createdAt: "2026-06-02T15:00:00Z" },
  { id: "act_09", activityType: "PROJECT_CREATED", entityType: "Project", entityId: "proj_02", metadata: { projectName: "Startup App" }, ipAddress: "192.168.1.1", createdAt: "2026-05-20T10:00:00Z" },
  { id: "act_10", activityType: "CREDIT_GRANTED", entityType: null, entityId: null, metadata: { amount: "5.00", reason: "Welcome bonus" }, ipAddress: "192.168.1.1", createdAt: "2026-01-15T10:01:00Z" },
  { id: "act_11", activityType: "API_KEY_CREATED", entityType: "ApiKey", entityId: "key_05", metadata: { keyName: "Staging" }, ipAddress: "192.168.1.1", createdAt: "2026-04-01T10:00:00Z" },
  { id: "act_12", activityType: "WALLET_TOPUP", entityType: null, entityId: null, metadata: { amount: "50.00", currency: "USD" }, ipAddress: "192.168.1.1", createdAt: "2026-03-15T10:00:00Z" },
  { id: "act_13", activityType: "PROJECT_UPDATED", entityType: "Project", entityId: "proj_01", metadata: { field: "name" }, ipAddress: "192.168.1.1", createdAt: "2026-03-10T09:00:00Z" },
  { id: "act_14", activityType: "USER_LOGIN", entityType: null, entityId: null, metadata: { device: "Firefox on Windows" }, ipAddress: "172.16.0.12", createdAt: "2026-03-05T08:00:00Z" },
  { id: "act_15", activityType: "API_KEY_CREATED", entityType: "ApiKey", entityId: "key_03", metadata: { keyName: "CI Testing" }, ipAddress: "192.168.1.1", createdAt: "2026-03-05T10:00:00Z" },
  { id: "act_16", activityType: "WALLET_TOPUP", entityType: null, entityId: null, metadata: { amount: "20.00", currency: "USD" }, ipAddress: "192.168.1.1", createdAt: "2026-02-10T11:00:00Z" },
  { id: "act_17", activityType: "API_KEY_CREATED", entityType: "ApiKey", entityId: "key_02", metadata: { keyName: "Development" }, ipAddress: "192.168.1.1", createdAt: "2026-02-10T10:00:00Z" },
  { id: "act_18", activityType: "API_KEY_CREATED", entityType: "ApiKey", entityId: "key_01", metadata: { keyName: "Production" }, ipAddress: "192.168.1.1", createdAt: "2026-01-20T10:00:00Z" },
  { id: "act_19", activityType: "PROJECT_CREATED", entityType: "Project", entityId: "proj_01", metadata: { projectName: "Personal" }, ipAddress: "192.168.1.1", createdAt: "2026-01-15T10:05:00Z" },
  { id: "act_20", activityType: "USER_REGISTERED", entityType: null, entityId: null, metadata: { email: "dev@modelbridge.io" }, ipAddress: "192.168.1.1", createdAt: "2026-01-15T10:00:00Z" },
];

// ── Sessions ──────────────────────────────────────────────────────────────────
export const mockSessions = [
  {
    id: "sess_01",
    deviceName: "Chrome on macOS",
    userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/125.0",
    ipAddress: "192.168.1.1",
    lastUsedAt: "2026-06-08T09:00:00Z",
    expiresAt: "2026-06-15T09:00:00Z",
    isCurrent: true,
    createdAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "sess_02",
    deviceName: "Mobile Safari",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 Safari/604.1",
    ipAddress: "10.0.0.45",
    lastUsedAt: "2026-06-05T18:00:00Z",
    expiresAt: "2026-06-12T18:00:00Z",
    isCurrent: false,
    createdAt: "2026-05-29T00:00:00Z",
  },
  {
    id: "sess_03",
    deviceName: "Firefox on Windows",
    userAgent: "Mozilla/5.0 (Windows NT 10.0) Gecko/20100101 Firefox/126.0",
    ipAddress: "172.16.0.12",
    lastUsedAt: "2026-06-01T12:00:00Z",
    expiresAt: "2026-06-08T12:00:00Z",
    isCurrent: false,
    createdAt: "2026-05-25T00:00:00Z",
  },
];
