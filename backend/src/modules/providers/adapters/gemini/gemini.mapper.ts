import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderEmbeddingRequest,
  ProviderEmbeddingResponse,
} from "../base/provider.types.js";
import type {
  GeminiBatchEmbeddingRequest,
  GeminiContent,
  GeminiEmbedContentResponse,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
} from "./gemini.types.js";

const mapProviderMessageRoleToGeminiRole = (
  role: ProviderChatRequest["messages"][number]["role"]
): GeminiContent["role"] => (role === "assistant" ? "model" : "user");

const extractSystemInstruction = (request: ProviderChatRequest) => {
  const systemText = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!systemText) {
    return undefined;
  }

  return {
    parts: [{ text: systemText }],
  };
};

const mapChatMessagesToGeminiContents = (request: ProviderChatRequest): GeminiContent[] =>
  request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: mapProviderMessageRoleToGeminiRole(message.role),
      parts: [{ text: message.content }],
    }));

const toProviderUsage = (usageMetadata?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}) => ({
  promptTokens: usageMetadata?.promptTokenCount ?? 0,
  completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
  totalTokens:
    usageMetadata?.totalTokenCount ??
    (usageMetadata?.promptTokenCount ?? 0) + (usageMetadata?.candidatesTokenCount ?? 0),
});

export const extractGeminiText = (response: GeminiGenerateContentResponse) =>
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("") ?? "";

export const mapProviderChatRequestToGemini = (
  request: ProviderChatRequest
): GeminiGenerateContentRequest => {
  const contents = mapChatMessagesToGeminiContents(request);

  return {
    contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "" }] }],
    ...(extractSystemInstruction(request)
      ? { systemInstruction: extractSystemInstruction(request) }
      : {}),
    ...(request.temperature !== undefined || request.maxTokens !== undefined
      ? {
          generationConfig: {
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            ...(request.maxTokens !== undefined ? { maxOutputTokens: request.maxTokens } : {}),
          },
        }
      : {}),
  };
};

export const mapGeminiChatResponseToProviderResponse = (
  providerName: string,
  model: string,
  response: GeminiGenerateContentResponse,
  latencyMs: number
): ProviderChatResponse => {
  const candidate = response.candidates?.[0];

  return {
    requestId: response.responseId ?? `${providerName.toLowerCase()}-${Date.now()}`,
    provider: providerName,
    model,
    content: extractGeminiText(response),
    finishReason: candidate?.finishReason,
    usage: toProviderUsage(response.usageMetadata),
    metrics: {
      latencyMs,
      responseCompletionTimeMs: latencyMs,
    },
    rawResponse: response,
  };
};

export const mapProviderEmbeddingRequestToGemini = (
  request: ProviderEmbeddingRequest
): GeminiBatchEmbeddingRequest => {
  const inputValues = Array.isArray(request.input) ? request.input : [request.input];

  return {
    requests: inputValues.map((value) => ({
      content: {
        role: "user",
        parts: [{ text: value }],
      },
    })),
  };
};

export const mapGeminiEmbeddingResponseToProviderResponse = (
  providerName: string,
  model: string,
  response: GeminiEmbedContentResponse
): ProviderEmbeddingResponse => {
  const embeddings =
    response.embeddings?.map((embedding) => embedding.values ?? []) ??
    (response.embedding ? [response.embedding.values ?? []] : []);

  return {
    requestId: `${providerName.toLowerCase()}-embedding-${Date.now()}`,
    provider: providerName,
    model,
    embeddings,
    usage: toProviderUsage(response.usageMetadata),
    rawResponse: response,
  };
};
