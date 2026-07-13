export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicImageBlock {
  type: "image";
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | AnthropicTextBlock[];
  is_error?: boolean;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicToolDefinition {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

export type AnthropicToolChoice =
  | {
      type: "auto";
    }
  | {
      type: "any";
    }
  | {
      type: "tool";
      name: string;
    };

export interface AnthropicMessagesRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  cache_control?: {
    type: "ephemeral";
  };
  temperature?: number;
  stream?: boolean;
  tools?: AnthropicToolDefinition[];
  tool_choice?: AnthropicToolChoice;
}

export interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AnthropicMessagesResponse {
  id: string;
  type?: string;
  role?: "assistant";
  model?: string;
  content?: AnthropicContentBlock[];
  stop_reason?: string | null;
  usage?: AnthropicUsage;
}

export interface AnthropicMessageStartEvent {
  type: "message_start";
  message: AnthropicMessagesResponse;
}

export interface AnthropicContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block?: AnthropicContentBlock;
}

export interface AnthropicContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta?: {
    type?: "text_delta" | "input_json_delta";
    text?: string;
    partial_json?: string;
  };
}

export interface AnthropicContentBlockStopEvent {
  type: "content_block_stop";
  index: number;
}

export interface AnthropicMessageDeltaEvent {
  type: "message_delta";
  delta?: {
    stop_reason?: string | null;
  };
  usage?: {
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface AnthropicMessageStopEvent {
  type: "message_stop";
}

export interface AnthropicPingEvent {
  type: "ping";
}

export interface AnthropicErrorEvent {
  type: "error";
  error?: {
    type?: string;
    message?: string;
  };
}

export type AnthropicStreamEvent =
  | AnthropicMessageStartEvent
  | AnthropicContentBlockStartEvent
  | AnthropicContentBlockDeltaEvent
  | AnthropicMessageDeltaEvent
  | AnthropicContentBlockStopEvent
  | AnthropicMessageStopEvent
  | AnthropicPingEvent
  | AnthropicErrorEvent;

export interface AnthropicModelListResponse {
  data?: Array<{
    id?: string;
    display_name?: string;
  }>;
}
