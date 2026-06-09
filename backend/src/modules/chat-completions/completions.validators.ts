import { z } from "zod";

import { validateBody } from "../../shared/middlewares/validate.js";

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().trim().min(1),
  name: z.string().trim().min(1).optional(),
  toolCallId: z.string().trim().min(1).optional(),
});

export const chatCompletionsSchema = z.object({
  model: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional().default(false),
});

export const chatCompletionsValidator = validateBody(chatCompletionsSchema);
