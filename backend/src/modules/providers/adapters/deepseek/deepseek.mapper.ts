export {
  mapOpenAIChatResponseToProviderResponse as mapDeepSeekChatResponseToProviderResponse,
  mapOpenAIEmbeddingResponseToProviderResponse as mapDeepSeekEmbeddingResponseToProviderResponse,
  mapProviderChatRequestToOpenAI as mapProviderChatRequestToDeepSeek,
  mapProviderEmbeddingRequestToOpenAI as mapProviderEmbeddingRequestToDeepSeek,
} from "../openai/openai.mapper.js";
