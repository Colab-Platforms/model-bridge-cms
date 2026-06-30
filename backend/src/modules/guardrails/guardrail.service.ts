import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { promptInjectionDetector, type PromptInjectionDetector } from "./detectors/prompt-injection.detector.js";
import { secretDetector, type SecretDetector } from "./detectors/secret.detector.js";
import type { GuardrailResult } from "./interfaces/guardrail-result.interface.js";

type OpenAIModerationResponse = {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
  }>;
};

type OpenAIErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type FetchLike = typeof fetch;

export interface ModerationClient {
  moderate(prompt: string): Promise<GuardrailResult>;
}

export interface GuardrailServiceDependencies {
  moderationClient: ModerationClient;
  promptInjectionDetector: Pick<PromptInjectionDetector, "detect">;
  secretDetector: Pick<SecretDetector, "detect">;
}

export class OpenAIModerationClient implements ModerationClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  ) {}

  async moderate(prompt: string): Promise<GuardrailResult> {
    if (!this.apiKey.trim() || this.apiKey === "your_openai_api_key_here") {
      throw new AppError(
        "OPENAI_API_KEY is not configured with a real API key",
        STATUS_CODES.SERVER_ERROR
      );
    }

    const response = await this.fetchImpl(`${this.baseUrl}/moderations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: OpenAIErrorResponse | null = null;

      try {
        parsedError = JSON.parse(errorText) as OpenAIErrorResponse;
      } catch {
        parsedError = null;
      }

      const upstreamMessage =
        parsedError?.error?.message ||
        errorText ||
        `OpenAI moderation request failed with status ${response.status}`;

      throw new AppError(
        upstreamMessage,
        STATUS_CODES.SERVER_ERROR,
        {
          provider: "openai",
          statusCode: response.status,
          errorType: parsedError?.error?.type,
          errorCode: parsedError?.error?.code,
        }
      );
    }

    const payload = (await response.json()) as OpenAIModerationResponse;
    const isFlagged = payload.results.some((result) => result.flagged);

    if (isFlagged) {
      return {
        allowed: false,
        reason: "Content violates safety policy",
      };
    }

    return { allowed: true };
  }
}

export class GuardrailService {
  constructor(private readonly dependencies: GuardrailServiceDependencies) {}

  async validate(prompt: string): Promise<GuardrailResult> {
    const promptInjectionResult =
      this.dependencies.promptInjectionDetector.detect(prompt);

    if (promptInjectionResult) {
      return promptInjectionResult;
    }

    const secretDetectionResult = this.dependencies.secretDetector.detect(prompt);

    if (secretDetectionResult) {
      return secretDetectionResult;
    }

    // OpenAI moderation is temporarily disabled while local guardrails are
    // being tested and the API key/config is being finalized.
    // return this.dependencies.moderationClient.moderate(prompt);

    return { allowed: true };
  }
}

const openAIApiKey = process.env.OPENAI_API_KEY;

if (!openAIApiKey) {
  throw new AppError(
    "OPENAI_API_KEY is not configured",
    STATUS_CODES.SERVER_ERROR
  );
}

export const guardrailService = new GuardrailService({
  moderationClient: new OpenAIModerationClient(openAIApiKey),
  promptInjectionDetector,
  secretDetector,
});
