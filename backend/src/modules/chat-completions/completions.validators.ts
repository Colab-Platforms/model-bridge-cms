import { z } from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

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

export const chatCompletionsSchema = z.object({
  model: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  modalities: z.array(z.string().trim().min(1)).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional().default(false),
});

export const chatCompletionsValidator = validateBody(chatCompletionsSchema);
