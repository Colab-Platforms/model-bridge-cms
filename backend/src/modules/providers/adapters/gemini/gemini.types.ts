export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
  responseId?: string;
}

export interface GeminiEmbeddingRequest {
  content: GeminiContent;
}

export interface GeminiBatchEmbeddingRequest {
  requests: GeminiEmbeddingRequest[];
}

export interface GeminiContentEmbedding {
  values?: number[];
}

export interface GeminiEmbedContentResponse {
  embedding?: GeminiContentEmbedding;
  embeddings?: GeminiContentEmbedding[];
  usageMetadata?: GeminiUsageMetadata;
}

export interface GeminiModelListResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
  }>;
}
