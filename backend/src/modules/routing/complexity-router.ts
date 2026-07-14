import { ComplexityTier } from "@prisma/client";

/**
 * Native, self-hosted complexity classifier — replaces the Not Diamond API call for
 * `model: "auto"` requests. Ported 1:1 from complexity_router.py / config.py
 * (LiteLLM's ComplexityRouter, itself inspired by ClawRouter) — keyword lists,
 * dimension weights, tier boundaries, and per-dimension scoring thresholds all match
 * the reference. The tier boundaries only make sense together with the reference's
 * discrete threshold scoring below, so both were ported together rather than keeping
 * this project's earlier continuous-ratio scoring with the reference's keyword lists
 * bolted on.
 */

// ─── Default keyword lists (verbatim from config.py) ───
// Single-word keywords are matched on word boundaries; multi-word phrases by substring.

export const DEFAULT_CODE_KEYWORDS: string[] = [
  "function", "class", "def", "const", "let", "var", "import", "export", "return",
  "async", "await", "try", "catch", "exception", "error", "debug", "api", "endpoint",
  "request", "response", "database", "sql", "query", "schema", "algorithm", "implement",
  "refactor", "optimize", "python", "javascript", "typescript", "java", "rust", "golang",
  "react", "vue", "angular", "node", "docker", "kubernetes", "git", "commit", "merge",
  "branch", "pull request",
];

export const DEFAULT_REASONING_KEYWORDS: string[] = [
  "step by step", "think through", "let's think", "reason through", "analyze this",
  "break down", "explain your reasoning", "show your work", "chain of thought",
  "think carefully", "consider all", "evaluate", "pros and cons", "compare and contrast",
  "weigh the options", "logical", "deduce", "infer", "conclude",
];

export const DEFAULT_TECHNICAL_KEYWORDS: string[] = [
  "architecture", "distributed", "scalable", "microservice", "machine learning",
  "neural network", "deep learning", "encryption", "authentication", "authorization",
  "performance", "latency", "throughput", "benchmark", "concurrency", "parallel",
  "threading", "memory", "cpu", "gpu", "optimization", "protocol", "tcp", "http", "grpc",
  "websocket", "container", "orchestration",
  // Note: "async", "kubernetes", "docker" live in DEFAULT_CODE_KEYWORDS instead.
];

export const DEFAULT_SIMPLE_KEYWORDS: string[] = [
  "what is", "what's", "define", "definition of", "who is", "who was", "when did",
  "when was", "where is", "where was", "how many", "how much", "yes or no", "true or false",
  "simple", "brief", "short", "quick", "hello", "hi", "hey", "thanks", "thank you",
  "goodbye", "bye", "okay",
  // Note: "ok" is deliberately excluded — false positives against "token", "book", etc.
];

// ─── Default dimension weights (verbatim from config.py) ───

interface DimensionWeights {
  tokenCount: number;
  codePresence: number;
  reasoningMarkers: number;
  technicalTerms: number;
  simpleIndicators: number;
  multiStepPatterns: number;
  questionComplexity: number;
}

export const DEFAULT_WEIGHTS: DimensionWeights = {
  tokenCount: 0.1,
  codePresence: 0.3,
  reasoningMarkers: 0.25,
  technicalTerms: 0.25,
  simpleIndicators: 0.05,
  multiStepPatterns: 0.03,
  questionComplexity: 0.02,
};

// ─── Default tier boundaries + token thresholds (verbatim from config.py) ───

interface TierBoundaries {
  simple: number; // simple_medium
  medium: number; // medium_complex
  complex: number; // complex_reasoning
}

export const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  simple: 0.15,
  medium: 0.35,
  complex: 0.6,
};

interface TokenThresholds {
  simple: number;
  complex: number;
}

export const DEFAULT_TOKEN_THRESHOLDS: TokenThresholds = {
  simple: 15,
  complex: 400,
};

/** 2+ reasoning markers in the user's own message forces REASONING, no matter the score. */
export const DEFAULT_REASONING_OVERRIDE_MIN_MARKERS = 2;

// ReDoS-safe: each pattern has at most one non-greedy/bounded wildcard, no nesting.
const MULTI_STEP_PATTERNS: RegExp[] = [
  /first.*?then/i,
  /step\s*\d/i,
  /\d+\.\s/,
  /[a-z]\)\s/i,
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Single-word keywords use word-boundary matching so "api" doesn't match inside
 * "capital" (or "error" inside "terrorism", "class" inside "classical"). Multi-word
 * phrases use plain substring matching — already space-delimited, no ambiguity.
 */
const keywordMatches = (text: string, keyword: string): boolean => {
  const lower = keyword.toLowerCase();

  if (!lower.includes(" ")) {
    return new RegExp(`\\b${escapeRegExp(lower)}\\b`, "i").test(text);
  }

  return text.includes(lower);
};

interface DimensionScore {
  name: keyof DimensionWeights;
  score: number;
  signal: string | null;
}

interface KeywordDimensionResult {
  dimension: DimensionScore;
  matchCount: number;
}

const scoreKeywordMatch = (
  text: string,
  keywords: string[],
  name: keyof DimensionWeights,
  signalLabel: string,
  thresholds: { low: number; high: number },
  scores: { none: number; low: number; high: number }
): KeywordDimensionResult => {
  const matches = keywords.filter((keyword) => keywordMatches(text, keyword));
  const matchCount = matches.length;

  if (matchCount >= thresholds.high) {
    return {
      dimension: { name, score: scores.high, signal: `${signalLabel} (${matches.slice(0, 3).join(", ")})` },
      matchCount,
    };
  }

  if (matchCount >= thresholds.low) {
    return {
      dimension: { name, score: scores.low, signal: `${signalLabel} (${matches.slice(0, 3).join(", ")})` },
      matchCount,
    };
  }

  return { dimension: { name, score: scores.none, signal: null }, matchCount };
};

/** ~4 chars per token, matching the reference's estimator. */
const estimateTokens = (text: string) => Math.floor(text.length / 4);

const scoreTokenCount = (estimatedTokens: number, thresholds: TokenThresholds): DimensionScore => {
  if (estimatedTokens < thresholds.simple) {
    return { name: "tokenCount", score: -1.0, signal: `short (${estimatedTokens} tokens)` };
  }

  if (estimatedTokens > thresholds.complex) {
    return { name: "tokenCount", score: 1.0, signal: `long (${estimatedTokens} tokens)` };
  }

  return { name: "tokenCount", score: 0, signal: null };
};

const scoreMultiStep = (text: string): DimensionScore => {
  const hits = MULTI_STEP_PATTERNS.filter((pattern) => pattern.test(text)).length;

  return hits > 0
    ? { name: "multiStepPatterns", score: 0.5, signal: "multi-step" }
    : { name: "multiStepPatterns", score: 0, signal: null };
};

const scoreQuestionComplexity = (text: string): DimensionScore => {
  const count = (text.match(/\?/g) ?? []).length;

  return count > 3
    ? { name: "questionComplexity", score: 0.5, signal: `${count} questions` }
    : { name: "questionComplexity", score: 0, signal: null };
};

export interface ComplexityClassificationInput {
  userMessage: string;
  /** Folded into codePresence/technicalTerms/simpleIndicators/multiStepPatterns, but NOT reasoningMarkers — see below. */
  systemMessage?: string;
}

export interface ComplexityRouterOptions {
  weights?: Partial<DimensionWeights>;
  tierBoundaries?: Partial<TierBoundaries>;
  tokenThresholds?: Partial<TokenThresholds>;
  reasoningOverrideMinMarkers?: number;
  codeKeywords?: string[];
  reasoningKeywords?: string[];
  technicalKeywords?: string[];
  simpleKeywords?: string[];
}

export interface ComplexityClassification {
  tier: ComplexityTier;
  /** Weighted sum, deliberately NOT clamped — tokenCount and simpleIndicators can both score negative. */
  score: number;
  /** Human-readable, one entry per triggered dimension, e.g. "codePresence: code (function, exception, algorithm)". */
  signals: string[];
  forcedByReasoningOverride: boolean;
}

export const classifyComplexity = (
  input: ComplexityClassificationInput,
  options: ComplexityRouterOptions = {}
): ComplexityClassification => {
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const boundaries = { ...DEFAULT_TIER_BOUNDARIES, ...options.tierBoundaries };
  const tokenThresholds = { ...DEFAULT_TOKEN_THRESHOLDS, ...options.tokenThresholds };
  const reasoningOverrideMinMarkers =
    options.reasoningOverrideMinMarkers ?? DEFAULT_REASONING_OVERRIDE_MIN_MARKERS;

  const userMessage = input.userMessage ?? "";
  // System prompt is folded into codePresence/technicalTerms/simpleIndicators/
  // multiStepPatterns — legitimate deployment-level context (e.g. "You are a Python
  // assistant" signals a code-capable model is appropriate). reasoningMarkers reads
  // userText only, so a system prompt can never force REASONING by itself.
  const fullText = `${input.systemMessage ?? ""} ${userMessage}`.toLowerCase();
  const userText = userMessage.toLowerCase();

  const estimatedTokens = estimateTokens(userMessage);

  const tokenCount = scoreTokenCount(estimatedTokens, tokenThresholds);
  const { dimension: codePresence } = scoreKeywordMatch(
    fullText,
    options.codeKeywords ?? DEFAULT_CODE_KEYWORDS,
    "codePresence",
    "code",
    { low: 1, high: 2 },
    { none: 0, low: 0.5, high: 1.0 }
  );
  const { dimension: reasoningMarkers, matchCount: reasoningMatchCount } = scoreKeywordMatch(
    userText,
    options.reasoningKeywords ?? DEFAULT_REASONING_KEYWORDS,
    "reasoningMarkers",
    "reasoning",
    { low: 1, high: 2 },
    { none: 0, low: 0.7, high: 1.0 }
  );
  const { dimension: technicalTerms } = scoreKeywordMatch(
    fullText,
    options.technicalKeywords ?? DEFAULT_TECHNICAL_KEYWORDS,
    "technicalTerms",
    "technical",
    { low: 2, high: 4 },
    { none: 0, low: 0.5, high: 1.0 }
  );
  const { dimension: simpleIndicators } = scoreKeywordMatch(
    fullText,
    options.simpleKeywords ?? DEFAULT_SIMPLE_KEYWORDS,
    "simpleIndicators",
    "simple",
    { low: 1, high: 2 },
    { none: 0, low: -1.0, high: -1.0 }
  );
  const multiStepPatterns = scoreMultiStep(fullText);
  const questionComplexity = scoreQuestionComplexity(userMessage);

  const dimensions: DimensionScore[] = [
    tokenCount,
    codePresence,
    reasoningMarkers,
    technicalTerms,
    simpleIndicators,
    multiStepPatterns,
    questionComplexity,
  ];

  const score = dimensions.reduce((sum, dimension) => sum + dimension.score * weights[dimension.name], 0);
  const signals = dimensions
    .filter((dimension): dimension is DimensionScore & { signal: string } => dimension.signal !== null)
    .map((dimension) => `${dimension.name}: ${dimension.signal}`);

  const forcedByReasoningOverride = reasoningMatchCount >= reasoningOverrideMinMarkers;

  let tier: ComplexityTier;

  if (forcedByReasoningOverride) {
    tier = ComplexityTier.REASONING;
    signals.push(
      `override: ${reasoningMatchCount} reasoning markers in user message >= ${reasoningOverrideMinMarkers} -> forced REASONING`
    );
  } else if (score < boundaries.simple) {
    tier = ComplexityTier.SIMPLE;
  } else if (score < boundaries.medium) {
    tier = ComplexityTier.MEDIUM;
  } else if (score < boundaries.complex) {
    tier = ComplexityTier.COMPLEX;
  } else {
    tier = ComplexityTier.REASONING;
  }

  return { tier, score, signals, forcedByReasoningOverride };
};
