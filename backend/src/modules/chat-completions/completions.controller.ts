import { Request, Response } from "express";

import { completionsService } from "./completions.service.js";
import { multiModelCompletionsService } from "./multi-model.service.js";
import type {
  ChatCompletionsRequest,
  SingleModelChatCompletionsInput,
} from "./completions.types.js";

const toSingleModelBody = (
  body: ChatCompletionsRequest["body"]
): SingleModelChatCompletionsInput => ({
  model: body.models[0] as string,
  messages: body.messages,
  ...(body.modalities !== undefined ? { modalities: body.modalities } : {}),
  ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
  ...(body.max_tokens !== undefined ? { max_tokens: body.max_tokens } : {}),
  stream: body.stream ?? false,
});

export const chatCompletionsController = async (req: Request, res: Response) => {
  const typedRequest = req as ChatCompletionsRequest;
  const isMultiModelRequest = typedRequest.body.models.length > 1;

  if (isMultiModelRequest && typedRequest.body.stream) {
    return res.status(501).json({
      status: false,
      message: "Multi-model streaming is not implemented yet",
    });
  }

  if (isMultiModelRequest) {
    const result = await multiModelCompletionsService.execute({
      body: typedRequest.body,
      context: {
        user: typedRequest.user,
        project: typedRequest.project,
        apiKey: typedRequest.apiKey,
        creditCheck: typedRequest.creditCheck,
      },
    });

    return res.status(200).json(result);
  }

  if (typedRequest.body.stream) {
    let clientConnected = true;
    req.on("close", () => {
      clientConnected = false;
    });

    const stream = await completionsService.executeStream(
      {
        body: toSingleModelBody(typedRequest.body),
        context: {
          user: typedRequest.user,
          project: typedRequest.project,
          apiKey: typedRequest.apiKey,
          creditCheck: typedRequest.creditCheck,
        },
      },
      {
        isClientConnected: () => clientConnected,
      }
    );

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of stream) {
        if (!clientConnected) {
          break;
        }

        res.write(chunk);
      }
    } catch (error) {
      console.error("Streaming chat completion failed:", error);
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }

    return;
  }

  const result = await completionsService.execute({
    body: toSingleModelBody(typedRequest.body),
    context: {
      user: typedRequest.user,
      project: typedRequest.project,
      apiKey: typedRequest.apiKey,
      creditCheck: typedRequest.creditCheck,
    },
  });

  return res.status(200).json(result);
};
