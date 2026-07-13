import type { NextFunction, Request, Response } from "express";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { guardrailService, type GuardrailService } from "./guardrail.service.js";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content:
    | string
    | null
    | Array<
        | {
            type: "text";
            text: string;
          }
        | {
            type: "image_url";
            image_url: {
              url: string;
            };
          }
      >;
};

type ChatMessageContentPart = Exclude<ChatMessage["content"], string | null>[number];

type GuardrailRequestBody = {
  messages?: ChatMessage[];
};

export interface GuardrailMiddlewareDependencies {
  guardrailService: Pick<GuardrailService, "validate">;
}

const extractPromptText = (messages: ChatMessage[] = []) =>
  messages
    .map((message) => {
      if (typeof message.content === "string") {
        return `[${message.role}] ${message.content}`;
      }

      if (message.content === null) {
        return "";
      }

      const textContent = message.content
        .filter((part): part is Extract<ChatMessageContentPart, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join(" ");

      return textContent ? `[${message.role}] ${textContent}` : "";
    })
    .filter(Boolean)
    .join("\n");

export const createGuardrailMiddleware = (
  dependencies: GuardrailMiddlewareDependencies
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const body = req.body as GuardrailRequestBody;
      const prompt = extractPromptText(body.messages ?? []);

      if (!prompt.trim()) {
        return next();
      }

      const validationResult = await dependencies.guardrailService.validate(prompt);

      if (!validationResult.allowed) {
        return next(
          new AppError(validationResult.reason, STATUS_CODES.FORBIDDEN)
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const guardrailMiddleware = createGuardrailMiddleware({
  guardrailService,
});

export default guardrailMiddleware;
