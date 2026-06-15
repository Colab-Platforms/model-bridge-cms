import type {
  ProviderContentPart,
  ProviderChatRequest,
  ProviderChatResponse,
} from "../base/provider.types.js";
import type {
  AnthropicMessage,
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  AnthropicUsage,
} from "./anthropic.types.js";

const DEFAULT_ANTHROPIC_MAX_TOKENS = 1024;

const mapProviderContentPartToAnthropicBlock = (part: ProviderContentPart) => {
  if (part.type === "text") {
    return {
      type: "text" as const,
      text: part.text,
    };
  }

  return {
    type: "text" as const,
    text: `[image] ${part.image_url.url}`,
  };
};

const mapProviderContentToAnthropicContent = (content: string | ProviderContentPart[]) =>
  typeof content === "string"
    ? content
    : content.map(mapProviderContentPartToAnthropicBlock);

const extractTextFromProviderContent = (content: string | ProviderContentPart[]) =>
  typeof content === "string"
    ? content
    : content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

const mapProviderMessageRoleToAnthropicRole = (
  role: ProviderChatRequest["messages"][number]["role"]
): AnthropicMessage["role"] => (role === "assistant" ? "assistant" : "user");

const extractSystemPrompt = (request: ProviderChatRequest) => {
  const value = request.messages
    .filter((message) => message.role === "system")
    .map((message) => extractTextFromProviderContent(message.content).trim())
    .filter(Boolean)
    .join("\n\n");

  return value || undefined;
};

const mapChatMessagesToAnthropicMessages = (
  request: ProviderChatRequest
): AnthropicMessage[] => {
  const nonSystemMessages = request.messages.filter((message) => message.role !== "system");

  if (nonSystemMessages.length === 0) {
    return [{ role: "user", content: "" }];
  }

  return nonSystemMessages.map((message) => ({
    role: mapProviderMessageRoleToAnthropicRole(message.role),
    content: mapProviderContentToAnthropicContent(message.content),
  }));
};

export const mapProviderChatRequestToAnthropic = (
  request: ProviderChatRequest
): AnthropicMessagesRequest => ({
  model: request.model,
  max_tokens: request.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS,
  messages: mapChatMessagesToAnthropicMessages(request),
  ...(extractSystemPrompt(request) ? { system: extractSystemPrompt(request) } : {}),
  ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
  ...(request.stream !== undefined ? { stream: request.stream } : {}),
});

export const extractAnthropicText = (response: AnthropicMessagesResponse) =>
  response.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("") ?? "";

export const toProviderUsage = (usage?: AnthropicUsage) => ({
  promptTokens: usage?.input_tokens ?? 0,
  completionTokens: usage?.output_tokens ?? 0,
  totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
});

export const mapAnthropicResponseToProviderResponse = (
  providerName: string,
  model: string,
  response: AnthropicMessagesResponse,
  latencyMs: number
): ProviderChatResponse => ({
  requestId: response.id ?? `${providerName.toLowerCase()}-${Date.now()}`,
  provider: providerName,
  model,
  content: extractAnthropicText(response),
  finishReason: response.stop_reason ?? undefined,
  usage: toProviderUsage(response.usage),
  metrics: {
    latencyMs,
    responseCompletionTimeMs: latencyMs,
  },
  rawResponse: response,
});
