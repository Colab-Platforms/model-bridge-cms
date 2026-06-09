# ModelBridge Backend API Guide

## Base URL

Use this base URL for all app API calls:

```txt
{YOUR_BACKEND_URL}/api/v0
```

Example:

```txt
http://localhost:5000/api/v0
```

## Health URLs

Basic health endpoints:

```txt
GET {YOUR_BACKEND_URL}/health
GET {YOUR_BACKEND_URL}/api/v0/health
```

## Auth Rules

There are 2 auth styles in the current backend:

### 1. User JWT auth

Used by:
- wallets
- api-keys
- providers

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

Example:

```txt
GET /models?isActive=true
GET /models?slug=gpt-4o
GET /models?providerId=abc123
```

### GET `/models/:id`

Get model by internal model id.

Example:

```txt
GET /models/cm123abc
```

---

## 3. API Keys APIs

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

## 4. Wallet APIs

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

## 5. Providers APIs

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

## 6. Chat Completions API

This is the main AI generation endpoint.

Auth:

```http
Authorization: Bearer <PROJECT_API_KEY>
```

### POST `/v1/chat/completions`

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
POST /v1/chat/completions
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

## 7. Root / Health

### GET `/`

Example:

```txt
GET /api/v0/
```

### GET `/health`

Available at:

```txt
GET /health
GET /api/v0/health
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
3. Create project API key
4. Use that API key in:

```http
Authorization: Bearer <PROJECT_API_KEY>
```

5. Call `/v1/chat/completions`

### Important

Mounted route files exist for many other modules, but several of them are still stubs. This doc includes the endpoints that are currently implemented and ready for integration based on the backend code.
