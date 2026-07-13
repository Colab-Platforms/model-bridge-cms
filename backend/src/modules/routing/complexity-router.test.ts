import { ComplexityTier } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { classifyComplexity, DEFAULT_TIER_BOUNDARIES } from "./complexity-router.js";

describe("classifyComplexity", () => {
  it("routes a simple greeting to SIMPLE", () => {
    const result = classifyComplexity({ userMessage: "Hi, thanks!" });

    expect(result.tier).toBe(ComplexityTier.SIMPLE);
    expect(result.forcedByReasoningOverride).toBe(false);
  });

  it("routes a prompt with 2+ code keywords higher than a simple greeting", () => {
    const baseline = classifyComplexity({ userMessage: "Hi, thanks!" });
    // Matches 4 DEFAULT_CODE_KEYWORDS entries: function, exception, algorithm, refactor.
    const result = classifyComplexity({
      userMessage:
        "Please refactor this function to fix the null pointer exception in the algorithm implementation.",
    });

    expect(result.tier).not.toBe(ComplexityTier.SIMPLE);
    expect(result.score).toBeGreaterThan(baseline.score);
    expect(result.signals.some((signal) => signal.startsWith("codePresence"))).toBe(true);
  });

  it("force-routes to REASONING when the user message has 2+ reasoning markers, even with a low weighted score", () => {
    // Matches 2 DEFAULT_REASONING_KEYWORDS phrases: "think through", "step by step".
    const result = classifyComplexity({ userMessage: "Please think through this step by step." });

    expect(result.forcedByReasoningOverride).toBe(true);
    expect(result.tier).toBe(ComplexityTier.REASONING);
    // The override is the thing doing the work here — the weighted score alone
    // (short message, no other signal) wouldn't have reached the REASONING boundary.
    expect(result.score).toBeLessThan(DEFAULT_TIER_BOUNDARIES.complex);
  });

  it("does not trigger the reasoning override from system-prompt-only markers", () => {
    const result = classifyComplexity({
      userMessage: "Hi",
      systemMessage: "You are an assistant. Please think through this step by step and explain your reasoning.",
    });

    expect(result.forcedByReasoningOverride).toBe(false);
    expect(result.tier).toBe(ComplexityTier.SIMPLE);
  });

  it("matches single-word keywords on word boundaries only (api must not match inside capital)", () => {
    const result = classifyComplexity({
      userMessage: "The capital of France is Paris, and it is a beautiful city.",
    });

    expect(result.signals.some((signal) => signal.startsWith("codePresence"))).toBe(false);
  });
});
