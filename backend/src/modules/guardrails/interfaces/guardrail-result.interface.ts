export type GuardrailAllowedResult = {
  allowed: true;
};

export type GuardrailBlockedResult = {
  allowed: false;
  reason: string;
};

export type GuardrailResult = GuardrailAllowedResult | GuardrailBlockedResult;
