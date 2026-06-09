import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
} from "../base/provider.types.js";
import type { GroqRequestPlaceholder } from "./groq.types.js";

export const mapProviderChatRequestToGroq = (
  request: ProviderChatRequest
): GroqRequestPlaceholder => ({
  model: request.model,
});

export const mapProviderEmbeddingRequestToGroq = (
  request: ProviderEmbeddingRequest
): GroqRequestPlaceholder => ({
  model: request.model,
});
