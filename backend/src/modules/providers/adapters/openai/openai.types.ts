export interface OpenAIChatCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content:
      | string
      | Array<
          | {
              type: "text";
              text: string;
              cache_control?: {
                type: "ephemeral";
              };
            }
          | {
              type: "image_url";
              image_url: {
                url: string;
              };
              cache_control?: {
                type: "ephemeral";
              };
            }
        >
      | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  }>;
  modalities?: string[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stream_options?: {
    include_usage?: boolean;
  };
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?:
    | "auto"
    | "none"
    | "required"
    | {
        type: "function";
        function: {
          name: string;
        };
      };
}

export interface OpenAIChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string | null;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

export interface OpenAIStreamChatCompletionChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string | null;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string | null;
        type?: "function" | null;
        function?: {
          name?: string | null;
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

export interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIModelListResponse {
  data: Array<{
    id: string;
  }>;
}
