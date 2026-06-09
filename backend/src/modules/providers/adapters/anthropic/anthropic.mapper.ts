import type {
  ProviderChatRequest,
  ProviderEmbeddingRequest,
} from "../base/provider.types.js";
import type {
  AnthropicRequestPlaceholder,
} from "./anthropic.types.js";

export const mapProviderChatRequestToAnthropic = (
  request: ProviderChatRequest
): AnthropicRequestPlaceholder => ({
  model: request.model,
});

export const mapProviderEmbeddingRequestToAnthropic = (
  request: ProviderEmbeddingRequest
): AnthropicRequestPlaceholder => ({
  model: request.model,
});
