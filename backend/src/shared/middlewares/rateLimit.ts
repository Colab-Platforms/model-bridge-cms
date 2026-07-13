import type { NextFunction, Request, Response } from "express";

import { getRedisClient } from "../redis/index.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";

type FailureMode = "open" | "closed";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  windowMs: number;
  max: number;
  message: string;
  failureMode?: FailureMode;
  keyBuilder: (req: Request) => string | null | Promise<string | null>;
};

const MISSING_REDIS_SCOPE_WARNINGS = new Set<string>();

const DEFAULT_LIMITS = {
  globalWindowMs: 60_000,
  globalMax: 120,
  loginIpWindowMs: 60_000,
  loginIpMax: 10,
  loginEmailWindowMs: 10 * 60_000,
  loginEmailMax: 5,
  registerIpWindowMs: 10 * 60_000,
  registerIpMax: 10,
  registerEmailWindowMs: 60 * 60_000,
  registerEmailMax: 3,
  refreshIpWindowMs: 60_000,
  refreshIpMax: 20,
  googleWindowMs: 60_000,
  googleMax: 20,
  verifyEmailOtpIpWindowMs: 10 * 60_000,
  verifyEmailOtpIpMax: 10,
  verifyEmailOtpEmailWindowMs: 10 * 60_000,
  verifyEmailOtpEmailMax: 5,
  resendEmailOtpIpWindowMs: 10 * 60_000,
  resendEmailOtpIpMax: 5,
  resendEmailOtpEmailWindowMs: 15 * 60_000,
  resendEmailOtpEmailMax: 3,
  apiKeyWindowMs: 60_000,
  apiKeyMax: 30,
  apiUserWindowMs: 60_000,
  apiUserMax: 60,
} as const;

const getNumberFromEnv = (
  envKey: string,
  fallback: number
) => {
  const rawValue = process.env[envKey];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const normalizeValue = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9:_@.-]/g, "_");

const getClientIp = (req: Request) =>
  normalizeValue(req.ip || req.socket.remoteAddress || "unknown");

const getBodyRecord = (req: Request) =>
  req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : null;

const getNormalizedEmailFromBody = (req: Request) => {
  const body = getBodyRecord(req);
  const email = typeof body?.email === "string" ? body.email : null;

  if (!email) {
    return null;
  }

  return normalizeValue(email);
};

const toRateLimitRedisKey = (scope: string, key: string) =>
  `rl:${scope}:${normalizeValue(key)}`;

const setRateLimitHeaders = (res: Response, result: RateLimitResult) => {
  res.setHeader("X-RateLimit-Limit", result.limit.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(result.remaining, 0).toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());
  res.setHeader("Retry-After", result.retryAfterSeconds.toString());
};

const buildRateLimitPayload = (scope: string, result: RateLimitResult) => ({
  scope,
  limit: result.limit,
  remaining: Math.max(result.remaining, 0),
  retryAfterSeconds: result.retryAfterSeconds,
  resetAt: new Date(result.resetAt),
});

const consumeRateLimit = async (
  redisKey: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> => {
  const redis = getRedisClient();

  if (!redis) {
    throw new Error("Redis is not configured");
  }

  const [currentRaw, ttlRaw] = await redis.rateLimitIncrement(redisKey, windowMs);
  const current = Number(currentRaw);
  const ttlMs = Number(ttlRaw) > 0 ? Number(ttlRaw) : windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  const remaining = Math.max(limit - current, 0);

  return {
    allowed: current <= limit,
    limit,
    remaining,
    retryAfterSeconds,
    resetAt: Date.now() + ttlMs,
  };
};

const handleRateLimitFailure = (
  req: Request,
  res: Response,
  next: NextFunction,
  scope: string,
  failureMode: FailureMode,
  error: unknown
) => {
  console.error(`[RateLimit:${scope}] Middleware error for ${req.method} ${req.originalUrl}:`, error);

  if (failureMode === "open") {
    if (!MISSING_REDIS_SCOPE_WARNINGS.has(scope)) {
      console.warn(`[RateLimit:${scope}] Falling back to fail-open behavior.`);
      MISSING_REDIS_SCOPE_WARNINGS.add(scope);
    }
    next();
    return;
  }

  sendResponse(
    res,
    false,
    {
      scope,
    },
    "Rate limiter is temporarily unavailable",
    STATUS_CODES.SERVICE_UNAVAILABLE
  );
};

export const createRateLimitMiddleware = ({
  scope,
  windowMs,
  max,
  message,
  failureMode = "open",
  keyBuilder,
}: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = await keyBuilder(req);

      if (!identifier) {
        next();
        return;
      }

      const result = await consumeRateLimit(
        toRateLimitRedisKey(scope, identifier),
        max,
        windowMs
      );

      setRateLimitHeaders(res, result);

      if (result.allowed) {
        next();
        return;
      }

      sendResponse(
        res,
        false,
        buildRateLimitPayload(scope, result),
        message,
        STATUS_CODES.TOO_MANY_REQUESTS
      );
    } catch (error) {
      handleRateLimitFailure(req, res, next, scope, failureMode, error);
    }
  };
};

export const globalAppRateLimiter = createRateLimitMiddleware({
  scope: "global:api",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_GLOBAL_WINDOW_MS",
    DEFAULT_LIMITS.globalWindowMs
  ),
  max: getNumberFromEnv("RATE_LIMIT_GLOBAL_MAX", DEFAULT_LIMITS.globalMax),
  message: "Too many requests. Please slow down and try again shortly.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const loginIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:login:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_LOGIN_IP_WINDOW_MS",
    DEFAULT_LIMITS.loginIpWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_LOGIN_IP_MAX",
    DEFAULT_LIMITS.loginIpMax
  ),
  message: "Too many login attempts from this IP. Please try again shortly.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const loginEmailRateLimiter = createRateLimitMiddleware({
  scope: "auth:login:email",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_LOGIN_EMAIL_WINDOW_MS",
    DEFAULT_LIMITS.loginEmailWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_LOGIN_EMAIL_MAX",
    DEFAULT_LIMITS.loginEmailMax
  ),
  message: "Too many login attempts for this email. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => {
    const email = getNormalizedEmailFromBody(req);
    return email ? `email:${email}` : null;
  },
});

export const registerIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:register:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REGISTER_IP_WINDOW_MS",
    DEFAULT_LIMITS.registerIpWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REGISTER_IP_MAX",
    DEFAULT_LIMITS.registerIpMax
  ),
  message: "Too many registration attempts from this IP. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const registerEmailRateLimiter = createRateLimitMiddleware({
  scope: "auth:register:email",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REGISTER_EMAIL_WINDOW_MS",
    DEFAULT_LIMITS.registerEmailWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REGISTER_EMAIL_MAX",
    DEFAULT_LIMITS.registerEmailMax
  ),
  message: "Too many registration attempts for this email. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => {
    const email = getNormalizedEmailFromBody(req);
    return email ? `email:${email}` : null;
  },
});

export const refreshIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:refresh:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REFRESH_IP_WINDOW_MS",
    DEFAULT_LIMITS.refreshIpWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_REFRESH_IP_MAX",
    DEFAULT_LIMITS.refreshIpMax
  ),
  message: "Too many token refresh attempts. Please try again shortly.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const googleAuthIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:google:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_GOOGLE_IP_WINDOW_MS",
    DEFAULT_LIMITS.googleWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_GOOGLE_IP_MAX",
    DEFAULT_LIMITS.googleMax
  ),
  message: "Too many Google auth attempts. Please try again shortly.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const verifyEmailOtpIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:verify-email-otp:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_VERIFY_OTP_IP_WINDOW_MS",
    DEFAULT_LIMITS.verifyEmailOtpIpWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_VERIFY_OTP_IP_MAX",
    DEFAULT_LIMITS.verifyEmailOtpIpMax
  ),
  message: "Too many email verification attempts from this IP. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const verifyEmailOtpEmailRateLimiter = createRateLimitMiddleware({
  scope: "auth:verify-email-otp:email",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_VERIFY_OTP_EMAIL_WINDOW_MS",
    DEFAULT_LIMITS.verifyEmailOtpEmailWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_VERIFY_OTP_EMAIL_MAX",
    DEFAULT_LIMITS.verifyEmailOtpEmailMax
  ),
  message: "Too many email verification attempts for this email. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => {
    const email = getNormalizedEmailFromBody(req);
    return email ? `email:${email}` : null;
  },
});

export const resendEmailOtpIpRateLimiter = createRateLimitMiddleware({
  scope: "auth:resend-email-otp:ip",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_RESEND_OTP_IP_WINDOW_MS",
    DEFAULT_LIMITS.resendEmailOtpIpWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_RESEND_OTP_IP_MAX",
    DEFAULT_LIMITS.resendEmailOtpIpMax
  ),
  message: "Too many OTP resend attempts from this IP. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => `ip:${getClientIp(req)}`,
});

export const resendEmailOtpEmailRateLimiter = createRateLimitMiddleware({
  scope: "auth:resend-email-otp:email",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_AUTH_RESEND_OTP_EMAIL_WINDOW_MS",
    DEFAULT_LIMITS.resendEmailOtpEmailWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_AUTH_RESEND_OTP_EMAIL_MAX",
    DEFAULT_LIMITS.resendEmailOtpEmailMax
  ),
  message: "Too many OTP resend attempts for this email. Please try again later.",
  failureMode: "open",
  keyBuilder: (req) => {
    const email = getNormalizedEmailFromBody(req);
    return email ? `email:${email}` : null;
  },
});

export const apiKeyRateLimiter = createRateLimitMiddleware({
  scope: "api-key:requests",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_API_KEY_WINDOW_MS",
    DEFAULT_LIMITS.apiKeyWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_API_KEY_MAX",
    DEFAULT_LIMITS.apiKeyMax
  ),
  message: "This API key has reached its request rate limit. Please try again shortly.",
  failureMode: "closed",
  keyBuilder: (req) => {
    const apiKeyId = (req as Request & { apiKey?: { id?: string } }).apiKey?.id;
    return apiKeyId ? `api-key:${normalizeValue(apiKeyId)}` : null;
  },
});

export const apiUserRateLimiter = createRateLimitMiddleware({
  scope: "api-user:requests",
  windowMs: getNumberFromEnv(
    "RATE_LIMIT_API_USER_WINDOW_MS",
    DEFAULT_LIMITS.apiUserWindowMs
  ),
  max: getNumberFromEnv(
    "RATE_LIMIT_API_USER_MAX",
    DEFAULT_LIMITS.apiUserMax
  ),
  message: "This user has reached the API request rate limit. Please try again shortly.",
  failureMode: "closed",
  keyBuilder: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return userId ? `user:${normalizeValue(userId)}` : null;
  },
});
