import type {
  ProviderContentPart,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderChatMessage,
  ProviderToolChoice,
} from "../base/provider.types.js";
import type {
  AnthropicMessage,
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  AnthropicToolChoice,
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

const mapProviderContentToAnthropicContent = (content: string | ProviderContentPart[] | null) =>
  content === null
    ? ""
    : typeof content === "string"
    ? content
    : content.map(mapProviderContentPartToAnthropicBlock);

const extractTextFromProviderContent = (content: string | ProviderContentPart[] | null) =>
  content === null
    ? ""
    : typeof content === "string"
    ? content
    : content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

const mapProviderMessageRoleToAnthropicRole = (role: ProviderChatMessage["role"]): AnthropicMessage["role"] =>
  role === "assistant" ? "assistant" : "user";

const safelyParseToolArguments = (argumentsText: string) => {
  try {
    return JSON.parse(argumentsText);
  } catch {
    return { raw: argumentsText };
  }
};

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

  return nonSystemMessages.map((message) => {
    if (message.role === "assistant" && message.toolCalls?.length) {
      const contentBlocks = [
        ...(typeof message.content === "string" && message.content.trim()
          ? [{ type: "text" as const, text: message.content }]
          : Array.isArray(message.content)
            ? message.content.map(mapProviderContentPartToAnthropicBlock)
            : []),
        ...message.toolCalls.map((toolCall) => ({
          type: "tool_use" as const,
          id: toolCall.id,
          name: toolCall.function.name,
          input: safelyParseToolArguments(toolCall.function.arguments),
        })),
      ];

      return {
        role: "assistant",
        content: contentBlocks,
      };
    }

    if (message.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: message.toolCallId ?? "",
            content:
              typeof message.content === "string"
                ? message.content
                : extractTextFromProviderContent(message.content),
          },
        ],
      };
    }

    return {
      role: mapProviderMessageRoleToAnthropicRole(message.role),
      content: mapProviderContentToAnthropicContent(message.content),
    };
  });
};

const mapToolChoiceToAnthropic = (toolChoice?: ProviderToolChoice): AnthropicToolChoice | undefined => {
  if (!toolChoice || toolChoice === "none") {
    return undefined;
  }

  if (toolChoice === "auto") {
    return { type: "auto" };
  }

  if (toolChoice === "required") {
    return { type: "any" };
  }

  return {
    type: "tool",
    name: toolChoice.function.name,
  };
};

export const mapProviderChatRequestToAnthropic = (
  request: ProviderChatRequest
): AnthropicMessagesRequest => ({
  model: request.model,
  max_tokens: request.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS,
  messages: mapChatMessagesToAnthropicMessages(request),
  ...(extractSystemPrompt(request) ? { system: extractSystemPrompt(request) } : {}),
  cache_control: {
    type: "ephemeral",
  },
  ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
  ...(request.stream !== undefined ? { stream: request.stream } : {}),
  ...(request.tools?.length && request.toolChoice !== "none"
    ? {
        tools: request.tools.map((tool) => ({
          name: tool.function.name,
          ...(tool.function.description ? { description: tool.function.description } : {}),
          ...(tool.function.parameters ? { input_schema: tool.function.parameters } : {}),
        })),
      }
    : {}),
  ...(mapToolChoiceToAnthropic(request.toolChoice)
    ? { tool_choice: mapToolChoiceToAnthropic(request.toolChoice) }
    : {}),
});

export const extractAnthropicText = (response: AnthropicMessagesResponse) =>
  response.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("") ?? "";

export const extractAnthropicToolCalls = (response: AnthropicMessagesResponse) =>
  response.content
    ?.filter((block): block is Extract<(typeof response.content)[number], { type: "tool_use" }> => block.type === "tool_use")
    .map((block) => ({
      id: block.id,
      type: "function" as const,
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input ?? {}),
      },
    })) ?? [];

export const toProviderUsage = (usage?: AnthropicUsage) => ({
  promptTokens: usage?.input_tokens ?? 0,
  completionTokens: usage?.output_tokens ?? 0,
  totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
  cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
  cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
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
  toolCalls: extractAnthropicToolCalls(response),
  usage: toProviderUsage(response.usage),
  metrics: {
    latencyMs,
    responseCompletionTimeMs: latencyMs,
  },
  rawResponse: response,
});
