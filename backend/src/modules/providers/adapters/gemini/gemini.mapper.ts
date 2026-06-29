import type {
  ProviderContentPart,
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
  GeminiPart,
} from "./gemini.types.js";

const normalizeGeminiResponseModality = (modality: string) => modality.trim().toUpperCase();

const buildGeminiResponseModalities = (modalities?: string[]) => {
  if (!modalities?.length) {
    return undefined;
  }

  const normalizedModalities = Array.from(
    new Set(modalities.map(normalizeGeminiResponseModality).filter(Boolean))
  );

  return normalizedModalities.length > 0 ? normalizedModalities : undefined;
};

const mapGeminiPartToProviderContentPart = (part: GeminiPart): ProviderContentPart | null => {
  if (typeof part.text === "string" && part.text.length > 0) {
    return {
      type: "text",
      text: part.text,
    };
  }

  if (part.inlineData?.data) {
    return {
      type: "image_url",
      image_url: {
        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
      },
    };
  }

  return null;
};

const serializeProviderContent = (parts: ProviderContentPart[]) => {
  if (parts.length === 0) {
    return "";
  }

  const hasNonTextContent = parts.some((part) => part.type !== "text");

  if (!hasNonTextContent) {
    return parts
      .filter((part): part is Extract<ProviderContentPart, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return JSON.stringify(parts);
};

const extractGeminiContentParts = (response: GeminiGenerateContentResponse) =>
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map(mapGeminiPartToProviderContentPart)
    .filter((part): part is ProviderContentPart => part !== null) ?? [];

const normalizeProviderContent = (parts: ProviderContentPart[]) => {
  if (parts.length === 0) {
    return "";
  }

  const hasNonTextContent = parts.some((part) => part.type !== "text");

  if (hasNonTextContent) {
    return parts;
  }

  return parts
    .filter((part): part is Extract<ProviderContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
};

const mapProviderMessageRoleToGeminiRole = (
  role: ProviderChatRequest["messages"][number]["role"]
): GeminiContent["role"] => (role === "assistant" ? "model" : "user");

const mapProviderContentPartToGeminiPart = (part: ProviderContentPart): GeminiPart => {
  if (part.type === "text") {
    return { text: part.text };
  }

  const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return { text: `[image] ${part.image_url.url}` };
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
};

const mapProviderContentToGeminiParts = (content: string | ProviderContentPart[]): GeminiPart[] =>
  typeof content === "string"
    ? [{ text: content }]
    : content.map(mapProviderContentPartToGeminiPart);

const extractTextFromProviderContent = (content: string | ProviderContentPart[]) =>
  typeof content === "string"
    ? content
    : content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

const extractSystemInstruction = (request: ProviderChatRequest) => {
  const systemText = request.messages
    .filter((message) => message.role === "system")
    .map((message) => extractTextFromProviderContent(message.content).trim())
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
      parts: mapProviderContentToGeminiParts(message.content),
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
  serializeProviderContent(extractGeminiContentParts(response));

export const extractGeminiContent = (response: GeminiGenerateContentResponse) =>
  normalizeProviderContent(extractGeminiContentParts(response));

export const mapProviderChatRequestToGemini = (
  request: ProviderChatRequest
): GeminiGenerateContentRequest => {
  const contents = mapChatMessagesToGeminiContents(request);
  const responseModalities = buildGeminiResponseModalities(request.modalities);

  return {
    contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "" }] }],
    ...(extractSystemInstruction(request)
      ? { systemInstruction: extractSystemInstruction(request) }
      : {}),
    ...(request.temperature !== undefined || request.maxTokens !== undefined || responseModalities
      ? {
          generationConfig: {
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            ...(request.maxTokens !== undefined ? { maxOutputTokens: request.maxTokens } : {}),
            ...(responseModalities ? { responseModalities } : {}),
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
    content: extractGeminiContent(response),
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
