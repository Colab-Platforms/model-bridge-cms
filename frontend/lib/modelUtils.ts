import type { ModelFilters } from "@/types/index";

/**
 * Formats a token count into a human-readable context window size.
 * @example formatContextWindow(128000) // "128k"
 */
export function formatContextWindow(tokens: number | null): string {
  if (tokens === null) return "—";
  if (tokens >= 1_000_000) {
    return `${Math.floor(tokens / 1_000_000)}M`;
  }
  return `${Math.floor(tokens / 1_000)}k`;
}

/**
 * Formats a per-million-token price string as a USD display string.
 * Falls back to up to 6 decimal places for sub-cent prices.
 * @example formatPrice("0.000300") // "$0.0003"
 */
export function formatPrice(pricePerMillion: string): string {
  const value = parseFloat(pricePerMillion);
  const fixed2 = value.toFixed(2);
  if (fixed2 !== "0.00") {
    return `$${fixed2}`;
  }
  for (let decimals = 3; decimals <= 6; decimals++) {
    const formatted = value.toFixed(decimals);
    if (parseFloat(formatted) !== 0) {
      return `$${formatted}`;
    }
  }
  return `$${value.toFixed(6)}`;
}

/**
 * Estimates the total cost of a request given token counts and per-million prices.
 * @example estimateCost(1000, 500, "5.000000", "15.000000") // "$0.012500"
 */
export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  inputPricePerToken: string,
  outputPricePerToken: string
): string {
  const cost =
    (promptTokens / 1_000_000) * parseFloat(inputPricePerToken) +
    (completionTokens / 1_000_000) * parseFloat(outputPricePerToken);
  return `$${cost.toFixed(6)}`;
}

/**
 * Returns true if the model was released within the last 14 days.
 * @example isNewModel("2026-05-25") // true (if today is 2026-06-05)
 */
export function isNewModel(releaseDate: string | null): boolean {
  if (releaseDate === null) return false;
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return new Date(releaseDate).getTime() >= cutoff;
}

/**
 * Converts a ModelFilters object into a URL query string (no leading "?").
 * Array values are serialised as repeated params.
 * @example buildModelsQueryString({ providerId: ["anthropic", "openai"] })
 * // "providerId=anthropic&providerId=openai"
 */
export function buildModelsQueryString(filters: ModelFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

export const CAPABILITY_LABELS: Record<string, string> = {
  TEXT:      "Text",
  IMAGE:     "Image",
  EMBEDDING: "Embedding",
  AUDIO:     "Audio",
  VIDEO:     "Video",
  SPEECH:    "Speech",
  RESEARCH:  "Research",
};

export const CAPABILITY_COLORS: Record<string, string> = {
  TEXT:      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  IMAGE:     "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  EMBEDDING: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  AUDIO:     "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  VIDEO:     "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  SPEECH:    "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  RESEARCH:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  TEXT:      "Generates text responses for chat, completion, and instruction-following tasks.",
  IMAGE:     "Generates images from text prompts.",
  EMBEDDING: "Converts text into numerical vector representations for search and similarity tasks.",
  AUDIO:     "Processes or generates audio, including transcription and sound synthesis.",
  VIDEO:     "Generates short video clips from text descriptions or image prompts.",
  SPEECH:    "Converts text to natural-sounding spoken audio (text-to-speech).",
  RESEARCH:  "Performs autonomous multi-step web research to answer complex questions.",
};

export const MODALITY_LABELS: Record<string, string> = {
  text:  "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
};

export const MODALITY_COLORS: Record<string, string> = {
  text:  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  image: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  audio: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  video: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

