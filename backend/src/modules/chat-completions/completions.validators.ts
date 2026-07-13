import { z } from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

const DEFAULT_MAX_MODELS_PER_REQUEST = 5;

const parseMaxModelsPerRequest = () => {
  const rawValue = Number(process.env.MAX_MODELS_PER_REQUEST ?? DEFAULT_MAX_MODELS_PER_REQUEST);

  return Number.isInteger(rawValue) && rawValue > 0
    ? rawValue
    : DEFAULT_MAX_MODELS_PER_REQUEST;
};

const MAX_MODELS_PER_REQUEST = parseMaxModelsPerRequest();

const modelListSchema = z.array(z.string().trim().min(1)).min(1).max(MAX_MODELS_PER_REQUEST);
const modelFieldSchema = z.union([z.string().trim().min(1), modelListSchema]);
const jsonSchemaValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchemaValue),
    z.record(z.string(), jsonSchemaValue),
  ])
);

const contentPartSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
    cache_control: z.object({
      type: z.enum(["ephemeral"])
    }).optional(),
  }),

  z.object({
    type: z.literal("image_url"),
    image_url: z.object({
      url: z.string()
    }),
    cache_control: z.object({
      type: z.enum(["ephemeral"])
    }).optional(),
  })
]);

const toolCallSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("function"),
  function: z.object({
    name: z.string().trim().min(1),
    arguments: z.string(),
  }),
});

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([
    z.string().trim().min(1),
    z.array(contentPartSchema).min(1),
    z.null(),
  ]),
  name: z.string().trim().min(1).optional(),
  toolCallId: z.string().trim().min(1).optional(),
  tool_call_id: z.string().trim().min(1).optional(),
  tool_calls: z.array(toolCallSchema).min(1).optional(),
}).transform((message) => ({
  role: message.role,
  content: message.content,
  ...(message.name ? { name: message.name } : {}),
  ...(message.toolCallId || message.tool_call_id
    ? { toolCallId: message.toolCallId ?? message.tool_call_id }
    : {}),
  ...(message.tool_calls ? { toolCalls: message.tool_calls } : {}),
}));

const toolSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string().trim().min(1),
    description: z.string().optional(),
    parameters: z.record(z.string(), jsonSchemaValue).optional(),
  }),
});

const toolChoiceSchema = z.union([
  z.enum(["auto", "none", "required"]),
  z.object({
    type: z.literal("function"),
    function: z.object({
      name: z.string().trim().min(1),
    }),
  }),
]);

export const chatCompletionsSchema = z
  .object({
    model: modelFieldSchema,
    messages: z.array(chatMessageSchema).min(1),
    cache_control: z.object({
      type: z.enum(["ephemeral"])
    }).optional(),
    modalities: z.array(z.string().trim().min(1)).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional().default(false),
    tools: z.array(toolSchema).min(1).optional(),
    tool_choice: toolChoiceSchema.optional(),
  });

export const chatCompletionsValidator = validateBody(chatCompletionsSchema);
