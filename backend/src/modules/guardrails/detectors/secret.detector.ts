import type { GuardrailBlockedResult } from "../interfaces/guardrail-result.interface.js";

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/,
];

export class SecretDetector {
  detect(prompt: string): GuardrailBlockedResult | null {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          allowed: false,
          reason: "Sensitive credential detected",
        };
      }
    }

    return null;
  }
}

export const secretDetector = new SecretDetector();
