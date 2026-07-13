import { Request, Response } from "express";

import { completionsService } from "./completions.service.js";
import type { ChatCompletionsRequest } from "./completions.types.js";

export const chatCompletionsController = async (req: Request, res: Response) => {
  const typedRequest = req as ChatCompletionsRequest;

  if (typedRequest.body.stream) {
    let clientConnected = true;
    req.on("close", () => {
      clientConnected = false;
    });

    const stream = await completionsService.executeStream(
      {
        body: typedRequest.body,
        context: {
          user: typedRequest.user,
          project: typedRequest.project,
          apiKey: typedRequest.apiKey,
          creditCheck: typedRequest.creditCheck,
          requestedModelSlug: (typedRequest as any).routingMeta?.requestedModelSlug,
          routingReason: (typedRequest as any).routingMeta?.routingReason,
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
    body: typedRequest.body,
    context: {
      user: typedRequest.user,
      project: typedRequest.project,
      apiKey: typedRequest.apiKey,
      creditCheck: typedRequest.creditCheck,
      requestedModelSlug: (typedRequest as any).routingMeta?.requestedModelSlug,
      routingReason: (typedRequest as any).routingMeta?.routingReason,
      complexityTier: (typedRequest as any).routingMeta?.complexityTier,
      complexityScore: (typedRequest as any).routingMeta?.complexityScore,
    },
  });

  return res.status(200).json(result);
};
