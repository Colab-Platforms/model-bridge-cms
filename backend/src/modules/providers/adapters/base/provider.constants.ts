export const PROVIDER_NAMES = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "GROQ",
  "DEEPSEEK",
  "MISTRAL",
] as const;

export const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
export const DEFAULT_PROVIDER_RETRY_COUNT = 2;

export const PROVIDER_DEFAULT_BASE_URLS = {
  OPENAI: "https://api.openai.com/v1",
  ANTHROPIC: "https://api.anthropic.com/v1",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai",
  GROQ: "https://api.groq.com/openai/v1",
  DEEPSEEK: "https://api.deepseek.com/v1",
  MISTRAL: "https://api.mistral.ai/v1",
} as const;

export const PROVIDER_ENV_KEYS = {
  OPENAI: "OPENAI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GEMINI: "GEMINI_API_KEY",
  GROQ: "GROQ_API_KEY",
  DEEPSEEK: "DEEPSEEK_API_KEY",
  MISTRAL: "MISTRAL_API_KEY",
} as const;

export const PROVIDER_BASE_URL_ENV_KEYS = {
  OPENAI: "OPENAI_BASE_URL",
  ANTHROPIC: "ANTHROPIC_BASE_URL",
  GEMINI: "GEMINI_BASE_URL",
  GROQ: "GROQ_BASE_URL",
  DEEPSEEK: "DEEPSEEK_BASE_URL",
  MISTRAL: "MISTRAL_BASE_URL",
} as const;
