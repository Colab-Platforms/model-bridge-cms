You are a Staff Backend Engineer building the core request orchestration layer for ModelBridge, an OpenRouter-style AI gateway.

Current status:

✅ API Key Middleware implemented

✅ Credit Check Middleware implemented

✅ Provider Adapter Architecture implemented

✅ Provider Factory implemented

✅ OpenAI Adapter implemented

✅ InferenceTrackingService implemented

✅ WalletService implemented

✅ WalletTransactionService implemented

The missing piece is the orchestration layer that coordinates all of them.

Build a production-grade Chat Completions module.

---

## FOLDER STRUCTURE

chat-completions/

├── completions.controller.ts
├── completions.routes.ts
├── completions.service.ts
├── completions.validators.ts
├── completions.types.ts

---

## GOAL

Implement a unified endpoint:

POST /v1/chat/completions

This endpoint should behave like OpenAI/OpenRouter.

---

## REQUEST FLOW

Client Request
↓
Validation Middleware
↓
ApiKey Middleware
↓
Credit Check Middleware
↓
CompletionsController
↓
CompletionsService
↓
InferenceTrackingService.createPendingRequest()
↓
ProviderFactory
↓
ProviderAdapter
↓
InferenceTrackingService.completeRequest()
↓
Wallet Deduction
↓
Response

---

## SERVICE RESPONSIBILITIES

Create:

```ts
CompletionsService.execute()
```

This service becomes the single entry point for all model requests.

---

## STEP 1

Create PENDING request.

Call:

```ts
await inferenceTrackingService.createPendingRequest(...)
```

Store:

* userId
* projectId
* apiKeyId
* modelId
* requestedModelSlug
* stream
* status=PENDING

---

## STEP 2

Resolve provider.

Example:

```txt
gpt-5
↓
OPENAI

claude-sonnet-4
↓
ANTHROPIC
```

Use model record from DB.

---

## STEP 3

Load provider adapter.

```ts
const adapter =
 providerFactory.get(providerName);
```

---

## STEP 4

Build unified ProviderChatRequest.

```ts
{
  model,
  messages,
  temperature,
  maxTokens,
  stream
}
```

---

## STEP 5

Execute provider request.

```ts
const providerResponse =
 await adapter.chatCompletion(...)
```

---

## STEP 6

Call:

```ts
await inferenceTrackingService.completeRequest(...)
```

This should:

* calculate costs
* deduct wallet credits
* create wallet transaction
* update inference request

---

## STEP 7

Return OpenAI-compatible response.

Example:

```json
{
  "id": "...",
  "object": "chat.completion",
  "created": 123456,
  "model": "gpt-5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

---

## ERROR FLOW

If provider call fails:

```ts
await inferenceTrackingService
  .handleProviderFailure(...)
```

Update:

```txt
status = FAILED
```

No wallet deduction.

Then throw normalized error.

---

## STREAMING SUPPORT

Design service for future streaming support.

Add:

```ts
executeStream()
```

Method skeleton.

Do not fully implement streaming yet.

Leave TODO markers.

---

## REQUEST CONTEXT

Use data already attached by middleware:

```ts
req.user
req.project
req.apiKey
req.creditCheck
```

Do NOT query them again.

---

## VALIDATION

Validate:

* model
* messages
* stream
* temperature

using existing validator pattern.

---

## ARCHITECTURE RULES

Adapters:

* Provider communication only

InferenceTrackingService:

* Usage tracking
* Billing
* Cost calculation

WalletService:

* Credit movement only

CompletionsService:

* Request orchestration only

Keep responsibilities separated.

---

## CODE QUALITY

* Strict TypeScript
* No any
* Proper interfaces
* Service-oriented architecture
* SOLID principles
* Reusable DTOs
* Production-grade error handling

Generate complete code for:

* completions.controller.ts
* completions.routes.ts
* completions.service.ts
* completions.validators.ts
* completions.types.ts

and wire them to the existing ProviderFactory, InferenceTrackingService, WalletService, and adapter architecture.
