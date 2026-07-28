export const PROVIDER_NAMES = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "GROQ",
  "DEEPSEEK",
  "NVIDIA",
  "MISTRALAI",
  "X-AI",
] as const;

export const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
export const DEFAULT_PROVIDER_RETRY_COUNT = 2;

export const PROVIDER_DEFAULT_BASE_URLS = {
  OPENAI: "https://api.openai.com/v1",
  ANTHROPIC: "https://api.anthropic.com/v1",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta",
  GROQ: "https://api.groq.com/openai/v1",
  DEEPSEEK: "https://api.deepseek.com/v1",
  NVIDIA: "https://integrate.api.nvidia.com/v1",
  MISTRALAI: "https://api.mistral.ai/v1",
  "X-AI": "https://api.x.ai/v1",
} as const;

export const PROVIDER_ENV_KEYS = {
  OPENAI: "OPENAI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GEMINI: "GEMINI_API_KEY",
  GROQ: "GROQ_API_KEY",
  DEEPSEEK: "DEEPSEEK_API_KEY",
  NVIDIA: "NVIDIA_API_KEY",
  MISTRALAI: "MISTRAL_API_KEY",
  "X-AI": "XAI_API_KEY",
} as const;

export const PROVIDER_BASE_URL_ENV_KEYS = {
  OPENAI: "OPENAI_BASE_URL",
  ANTHROPIC: "ANTHROPIC_BASE_URL",
  GEMINI: "GEMINI_BASE_URL",
  GROQ: "GROQ_BASE_URL",
  DEEPSEEK: "DEEPSEEK_BASE_URL",
  NVIDIA: "NVIDIA_BASE_URL",
  MISTRALAI: "MISTRAL_BASE_URL",
  "X-AI": "XAI_BASE_URL",
} as const;
