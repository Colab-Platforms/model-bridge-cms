import {
  createDefaultProviderRuntimeConfig,
  type ProviderMetadata,
  type ProviderName,
  type ProviderRuntimeConfig,
} from "../adapters/base/provider.types.js";
import { ProviderError } from "../adapters/base/provider.errors.js";

const SUPPORTED_PROVIDER_NAMES = new Set<ProviderName>([
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "GROQ",
  "DEEPSEEK",
  "NVIDIA",
  "MISTRALAI",
  "X-AI",
]);

export const normalizeProviderName = (input: string): ProviderName => {
  const normalized = input.trim().toUpperCase();

  if (!SUPPORTED_PROVIDER_NAMES.has(normalized as ProviderName)) {
    throw new ProviderError(normalized, `Unsupported provider: ${input}`);
  }

  return normalized as ProviderName;
};

export const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new ProviderError("CONFIG", `Missing required environment variable: ${key}`);
  }

  return value;
};

export const resolveProviderRuntimeConfig = (
  providerName: ProviderName,
  metadata: ProviderMetadata
): ProviderRuntimeConfig => {
  const apiKey = getRequiredEnv(metadata.apiKeyEnvVar);
  const baseUrl = process.env[metadata.baseUrlEnvVar] ?? metadata.defaultBaseUrl;
  const timeoutMs = process.env.PROVIDER_TIMEOUT_MS
    ? Number(process.env.PROVIDER_TIMEOUT_MS)
    : undefined;
  const maxRetries = process.env.PROVIDER_RETRY_COUNT
    ? Number(process.env.PROVIDER_RETRY_COUNT)
    : undefined;

  return createDefaultProviderRuntimeConfig({
    name: providerName,
    apiKey,
    baseUrl,
    timeoutMs,
    maxRetries,
    headers:
      providerName === "ANTHROPIC"
        ? {
            "anthropic-version": "2023-06-01",
          }
        : undefined,
  });
};

export const calculateLatencyMs = (startedAt: number) => Date.now() - startedAt;

export const buildBearerAuthHeaders = (apiKey: string, extraHeaders?: Record<string, string>) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  ...extraHeaders,
});
