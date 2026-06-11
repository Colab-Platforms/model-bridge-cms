# ModelBridge Backend API Guide

## Base URL

Use this base URL for all app API calls:

```txt
{YOUR_BACKEND_URL}/api/v1
```

Example:

```txt
http://localhost:5000/api/v1
```

## Health URLs

Basic health endpoints:

```txt
GET {YOUR_BACKEND_URL}/health
GET {YOUR_BACKEND_URL}/api/v1/health
```

## Auth Rules

There are 2 auth styles in the current backend:

### 1. User JWT auth

Used by:
- wallets
- api-keys
- providers
- usage

Header:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

### 2. API key auth

Used by:
- chat completions

Header:

```http
Authorization: Bearer <PROJECT_API_KEY>
```

---

## Response Format

Most normal backend endpoints return:

```json
{
  "status": true,
  "data": {},
  "message": "Success message"
}
```

The streaming chat endpoint returns SSE chunks, not this wrapper.

---

## 1. Auth APIs

### POST `/auth/register`

Register a new user.

Payload:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phoneNo": "9999999999",
  "countryCode": "+91",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "profileImage": "https://example.com/avatar.png",
  "timezone": "Asia/Kolkata"
}
```

Required:
- `firstName`
- `lastName`
- `email`
- `password`

### POST `/auth/login`

Login user.

Payload:

```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

### POST `/auth/refresh`

Refresh access token.

Payload:

```json
{
  "refreshToken": "your_refresh_token"
}
```

### POST `/auth/logout`

Logout current session by revoking the provided refresh token.

Payload:

```json
{
  "refreshToken": "your_refresh_token"
}
```

### POST `/auth/logout-all`

Logout from all active sessions for the current logged-in user.

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

No request body required.

### Optional auth/session header

For login, register, and refresh, frontend can also send:

```http
x-device-name: Chrome on MacBook
```

This helps the backend store cleaner session/device metadata.

---

## 2. Models APIs

### GET `/models`

Get all models.

Optional query params:
- `providerId`
- `slug`
- `isActive=true|false`
- `page`
- `pageSize`

Example:

```txt
GET /models?isActive=true
GET /models?slug=gpt-4o
GET /models?providerId=abc123
GET /models?page=1&pageSize=10
GET /models?providerId=abc123&isActive=true&page=2&pageSize=5
```

Notes:
- default `page` is `1`
- default `pageSize` is `10`
- max `pageSize` is `100`

Paginated response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 10,
    "totalRecords": 27,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "data": [
      {
        "id": "cm_model_123",
        "providerId": "cm_provider_123",
        "slug": "gpt-4o",
        "displayName": "GPT-4o",
        "description": "General-purpose OpenAI model",
        "contextLength": 128000,
        "maxOutputTokens": 16384,
        "tokenizer": "cl100k_base",
        "inputPricePerToken": "0.00000500",
        "outputPricePerToken": "0.00001500",
        "cacheWritePricePerToken": null,
        "cacheReadPricePerToken": null,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "supportedParameters": ["temperature", "max_tokens", "stream"],
        "defaultForCapabilities": ["chat"],
        "isActive": true,
        "createdAt": "2026-06-10T10:00:00.000Z",
        "updatedAt": "2026-06-10T10:00:00.000Z",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI",
          "isActive": true
        }
      }
    ]
  },
  "message": "Models fetched successfully"
}
```

### GET `/models/:id`

Get model by internal model id.

Example:

```txt
GET /models/cm123abc
```

---

## 3. Projects APIs

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

### POST `/projects`

Create a project for the currently logged-in user.

Payload:

```json
{
  "name": "Frontend App",
  "slug": "frontend-app",
  "description": "Project used by the main frontend application",
  "isActive": true
}
```

Required:
- `name`

Notes:
- `slug` is optional
- if `slug` is not sent, backend auto-generates it from `name`
- project ownership always comes from the logged-in user token

### GET `/projects`

Get all projects for the current logged-in user.

Optional query params:
- `isActive=true|false`
- `slug`
- `search`

Examples:

```txt
GET /projects
GET /projects?isActive=true
GET /projects?slug=frontend-app
GET /projects?search=frontend
```

### GET `/projects/:id`

Get one project by internal project id.

Example:

```txt
GET /projects/cm_project_123 
```

### PATCH `/projects/:id`

Update project.

Payload:

```json
{
  "name": "Frontend App Production",
  "slug": "frontend-app-prod",
  "description": "Updated production project",
  "isActive": true
}
```

Notes:
- at least one field is required
- `slug: null` can be sent if frontend wants backend to regenerate a slug
- `description: null` clears the description

### DELETE `/projects/:id`

Soft delete project.

Notes:
- this also revokes and soft-deletes API keys linked to that project

---

## 4. API Keys APIs

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

### POST `/api-keys`

Create API key.

Payload:

```json
{
  "userId": "user_id_here",
  "projectId": "project_id_here",
  "name": "Frontend Key",
  "creditLimit": "100.00",
  "limitType": "MONTHLY",
  "status": "ACTIVE",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

Optional enums:
- `limitType`: `DAILY | WEEKLY | MONTHLY | QUATERLY | YEARLY`
- `status`: `ACTIVE | REVOKED | INACTIVE | EXPIRED | EXHAUSTED`

### GET `/api-keys`

Get all API keys.

Optional query params:
- `status`
- `projectId`
- `userId`

Examples:

```txt
GET /api-keys
GET /api-keys?projectId=project_id_here
GET /api-keys?userId=user_id_here
GET /api-keys?status=ACTIVE
```

### GET `/api-keys/:id`

Get API key by id.

### PATCH `/api-keys/:id`

Update API key.

Payload:

```json
{
  "name": "Updated Key Name",
  "creditLimit": "250.00",
  "limitType": "MONTHLY",
  "status": "INACTIVE",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

At least one field is required.

### DELETE `/api-keys/:id`

Soft delete API key.

### GET `/api-keys/project/:projectId`

Get API keys for one project.

### GET `/api-keys/user/:userId`

Get API keys for one user.

---

## 5. Wallet APIs

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

### POST `/wallets`

Create wallet for the currently logged-in user.

No request body required.

### GET `/wallets/me`

Get current user wallet details.

### GET `/wallets/balance`

Get current user wallet balance only.

### GET `/wallets/transactions`

Get current user wallet transactions.

Optional query params:
- `limit`

Example:

```txt
GET /wallets/transactions?limit=20
```

### POST `/wallets/me/add-balance`

Self top-up endpoint.

Payload:

```json
{
  "amount": "50.00",
  "description": "Wallet top-up",
  "referenceId": "frontend-topup-001"
}
```

### Admin-only wallet endpoints

These exist in backend, but should only be used by admin panels:

- `POST /wallets/add-balance`
- `POST /wallets/deduct-balance`
- `POST /wallets/refund`
- `POST /wallets/freeze`
- `POST /wallets/unfreeze`

---

## 6. Usage APIs

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

These endpoints return OpenRouter-style usage/log data for the logged-in user.

Notes:
- normal users only receive their own usage data
- `userId` can be sent only for admin/internal usage
- platform markup fields are intentionally not returned

### GET `/usage/logs`

Get paginated inference request logs.

Optional query params:
- `userId`
- `projectId`
- `apiKeyId`
- `modelId`
- `providerId`
- `status`
- `requestType`
- `stream=true|false`
- `search`
- `dateRangePreset`
- `from`
- `to`
- `sort`
- `page`
- `pageSize`

Supported `dateRangePreset` values:
- `today`
- `past_24h`
- `past_7d`
- `past_30d`
- `past_1y`
- `custom`

Supported `sort` fields:
- `createdAt`
- `totalCost`
- `totalTokens`
- `promptTokens`
- `completionTokens`
- `latencyMs`
- `responseCompletionTimeMs`
- `status`

Examples:

```txt
GET /usage/logs
GET /usage/logs?dateRangePreset=past_7d
GET /usage/logs?apiKeyId=cm_api_key_123&dateRangePreset=past_30d
GET /usage/logs?projectId=cm_project_123&status=SUCCESS&sort=createdAt:desc
GET /usage/logs?search=gpt&page=1&pageSize=20
GET /usage/logs?dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-11T23:59:59.000Z
```

Paginated response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "id": "cm_inf_123",
        "userId": "cm_user_123",
        "projectId": "cm_project_123",
        "apiKeyId": "cm_key_123",
        "modelId": "cm_model_123",
        "requestType": "CHAT",
        "requestedModelSlug": "gpt-5.4",
        "resolvedModelSlug": "gpt-5.4",
        "stream": false,
        "status": "SUCCESS",
        "responseCompletionTimeMs": 2200,
        "promptTokens": 812,
        "completionTokens": 318,
        "totalTokens": 1130,
        "totalCost": "0.00680000",
        "latencyMs": 640,
        "createdAt": "2026-06-11T10:15:00.000Z",
        "apiKey": {
          "id": "cm_key_123",
          "name": "AI Colab Chat",
          "keyPrefix": "mb_live_xxx",
          "status": "ACTIVE"
        },
        "project": {
          "id": "cm_project_123",
          "name": "AI Colab Chat",
          "slug": "ai-colab-chat",
          "isActive": true
        },
        "model": {
          "id": "cm_model_123",
          "slug": "gpt-5.4",
          "displayName": "GPT-5.4",
          "providerId": "cm_provider_123",
          "provider": {
            "id": "cm_provider_123",
            "slug": "openai",
            "displayName": "OpenAI",
            "isActive": true
          }
        }
      }
    ]
  },
  "message": "Usage logs fetched successfully"
}
```

### GET `/usage/summary`

Get aggregate usage totals for the selected filter set.

Optional query params:
- `userId`
- `projectId`
- `apiKeyId`
- `modelId`
- `providerId`
- `status`
- `requestType`
- `stream=true|false`
- `search`
- `dateRangePreset`
- `from`
- `to`

Examples:

```txt
GET /usage/summary?dateRangePreset=today
GET /usage/summary?projectId=cm_project_123&dateRangePreset=past_30d
GET /usage/summary?dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-11T23:59:59.000Z
```

Response shape:

```json
{
  "status": true,
  "data": {
    "range": {
      "from": "2026-06-04T10:00:00.000Z",
      "to": "2026-06-11T10:00:00.000Z"
    },
    "totals": {
      "totalRequests": 42,
      "successRequests": 38,
      "failedRequests": 2,
      "stoppedRequests": 1,
      "pendingRequests": 0,
      "partialRequests": 1,
      "promptTokens": 12000,
      "completionTokens": 8400,
      "totalTokens": 20400,
      "totalCost": "0.13700000",
      "averageLatencyMs": 721.5,
      "averageResponseCompletionTimeMs": 1880.2
    }
  },
  "message": "Usage summary fetched successfully"
}
```

### GET `/usage/timeseries`

Get grouped chart data for the selected date range.

Optional query params:
- `userId`
- `projectId`
- `apiKeyId`
- `modelId`
- `providerId`
- `status`
- `requestType`
- `stream=true|false`
- `search`
- `dateRangePreset`
- `from`
- `to`
- `granularity=hour|day|week|month`

Examples:

```txt
GET /usage/timeseries?dateRangePreset=past_7d
GET /usage/timeseries?apiKeyId=cm_key_123&dateRangePreset=past_30d&granularity=day
```

Response shape:

```json
{
  "status": true,
  "data": {
    "range": {
      "from": "2026-06-04T10:00:00.000Z",
      "to": "2026-06-11T10:00:00.000Z"
    },
    "granularity": "day",
    "series": [
      {
        "bucket": "2026-06-09T00:00:00.000Z",
        "requests": 12,
        "promptTokens": 4100,
        "completionTokens": 2900,
        "totalTokens": 7000,
        "totalCost": "0.04680000"
      }
    ]
  },
  "message": "Usage timeseries fetched successfully"
}
```

Search behavior:
- matches requested model slug
- matches resolved model slug
- matches API key name
- matches API key prefix
- matches project name
- matches model display name
- matches provider display name

---

## 7. Providers APIs

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

Note:
- these are admin-only endpoints

### GET `/providers`

Optional query params:
- `slug`
- `isActive=true|false`

### GET `/providers/:id`

Get provider by id.

### POST `/providers`

Payload:

```json
{
  "slug": "openai",
  "displayName": "OpenAI",
  "description": "OpenAI provider",
  "baseUrl": "https://api.openai.com/v1",
  "isActive": true
}
```

### PATCH `/providers/:id`

Payload:

```json
{
  "displayName": "OpenAI Updated",
  "description": "Updated description",
  "baseUrl": "https://api.openai.com/v1",
  "isActive": true
}
```

At least one field is required.

### DELETE `/providers/:id`

Soft delete provider.

---

## 8. Chat Completions API

This is the main AI generation endpoint.

Auth:

```http
Authorization: Bearer <PROJECT_API_KEY>
```

### POST `/chat/completions`

Payload:

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Write a short product description for ModelBridge."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 200,
  "stream": false
}
```

Message fields:
- `role`: `system | user | assistant | tool`
- `content`: string
- `name`: optional
- `toolCallId`: optional

### Normal response shape

When `stream=false`, response is OpenAI-compatible:

```json
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "created": 1711111111,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Generated text here"
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

### Streaming response

When `stream=true`, backend returns SSE.

Frontend should call this as a streaming endpoint and read chunks from:

```txt
POST /chat/completions
```

Example payload:

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "Write a streaming demo message."
    }
  ],
  "stream": true
}
```

The stream returns OpenAI-style SSE chunks and ends with:

```txt
data: [DONE]
```

---

## 9. Root / Health

### GET `/`

Example:

```txt
GET /api/v1/
```

### GET `/health`

Available at:

```txt
GET /health
GET /api/v1/health
```

---

## Frontend Notes

### User login flow

1. Call `/auth/register` or `/auth/login`
2. Save `accessToken`
3. Use `Authorization: Bearer <USER_ACCESS_TOKEN>` for user-protected routes

### AI generation flow

1. Create/login user
2. Create wallet and add balance
3. Create project using `/projects`
4. Create project API key using that project id
5. Use that API key in:

```http
Authorization: Bearer <PROJECT_API_KEY>
```

6. Call `/chat/completions`

### Important

Mounted route files exist for many other modules, but several of them are still stubs. This doc includes the endpoints that are currently implemented and ready for integration based on the backend code.
