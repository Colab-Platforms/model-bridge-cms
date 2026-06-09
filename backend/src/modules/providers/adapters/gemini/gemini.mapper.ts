import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
} from "../base/provider.types.js";
import type { GeminiRequestPlaceholder } from "./gemini.types.js";

export const mapProviderChatRequestToGemini = (
  request: ProviderChatRequest
): GeminiRequestPlaceholder => ({
  model: request.model,
});

export const mapProviderEmbeddingRequestToGemini = (
  request: ProviderEmbeddingRequest
): GeminiRequestPlaceholder => ({
  model: request.model,
});
