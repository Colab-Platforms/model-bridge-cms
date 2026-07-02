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

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([
    z.string().trim().min(1),
    z.array(contentPartSchema).min(1)
  ]),
  name: z.string().trim().min(1).optional(),
  toolCallId: z.string().trim().min(1).optional(),
});

export const chatCompletionsSchema = z
  .object({
    model: modelFieldSchema,
    messages: z.array(chatMessageSchema).min(1),
    modalities: z.array(z.string().trim().min(1)).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional().default(false),
  });

export const chatCompletionsValidator = validateBody(chatCompletionsSchema);
