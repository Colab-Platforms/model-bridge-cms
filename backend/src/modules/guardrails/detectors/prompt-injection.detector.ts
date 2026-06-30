import type { GuardrailBlockedResult } from "../interfaces/guardrail-result.interface.js";

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?previous\s+instructions?\b/i,
  /\breveal\s+(the\s+)?system\s+prompt\b/i,
  /\bshow\s+(the\s+)?hidden\s+prompt\b/i,
  /\bact\s+as\s+(the\s+)?developer\b/i,
  /\bbypass\s+safety\b/i,
  /\boverride\s+instructions?\b/i,
];

export class PromptInjectionDetector {
  detect(prompt: string): GuardrailBlockedResult | null {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          allowed: false,
          reason: "Prompt injection attempt detected",
        };
      }
    }

    return null;
  }
}

export const promptInjectionDetector = new PromptInjectionDetector();
