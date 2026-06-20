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
- overview

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

## 7. Overview API

Auth:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

This endpoint is designed for the user dashboard overview page.

### GET `/overview`

Get a single dashboard payload for the currently logged-in user.

Optional query params:
- `dateRangePreset`
- `from`
- `to`

Supported `dateRangePreset` values:
- `today`
- `past_24h`
- `weekly`
- `monthly`
- `yearly`
- `custom`

Examples:

```txt
GET /overview
GET /overview?dateRangePreset=weekly
GET /overview?dateRangePreset=monthly
GET /overview?dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-15T23:59:59.000Z
```

Response shape:

```json
{
  "status": true,
  "data": {
    "summary": {
      "walletBalance": "245.50000000",
      "currency": "USD",
      "walletStatus": "ACTIVE",
      "totalSequests": 42,
      "totalTpend": "0.13700000",
      "totalRokens": 20400,
      "activeProjects": 3,
      "activeApiKeys": 5,
      "successRate": 90.48,
      "avgLatencyMs": 721.5
    },
    "usage": {
      "requestsByStatus": {
        "success": 38,
        "failed": 2,
        "stopped": 1,
        "pending": 0,
        "partial": 1
      },
      "tokensBreakdown": {
        "prompt": 12000,
        "completion": 8400,
        "total": 20400
      },
      "streamVsNonStream": {
        "stream": 10,
        "nonStream": 32
      },
      "dateRange": {
        "preset": "weekly",
        "from": "2026-06-08T15:30:00.000+05:30",
        "to": "2026-06-15T12:45:00.000+05:30"
      }
    },
    "topModels": [
      {
        "modelId": "cm_model_123",
        "slug": "gpt-4o",
        "displayName": "GPT-4o",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 18,
        "totalTokens": 9800,
        "totalCost": "0.06100000"
      }
    ],
    "topProjects": [
      {
        "projectId": "cm_project_123",
        "name": "AI Colab Chat",
        "slug": "ai-colab-chat",
        "isActive": true,
        "requests": 24,
        "totalTokens": 11000,
        "totalCost": "0.07200000"
      }
    ],
    "apiKeys": {
      "topApiKeys": [
        {
          "apiKeyId": "cm_key_123",
          "name": "Frontend Key",
          "keyPrefix": "mb_live_xxx",
          "status": "ACTIVE",
          "project": {
            "id": "cm_project_123",
            "name": "AI Colab Chat",
            "slug": "ai-colab-chat"
          },
          "requests": 21,
          "totalTokens": 10200,
          "totalCost": "0.06600000",
          "lastUsedAt": "2026-06-15T11:30:00.000+05:30"
        }
      ]
    },
    "wallet": {
      "currentBalance": "245.50000000",
      "currency": "USD",
      "lowBalanceAlert": false,
      "totalCreditsAdded": "50.00000000",
      "totalUsageDeducted": "0.13700000",
      "totalRefunded": "0",
      "totalTransactionsAmount": "50.13700000",
      "recentTransactions": [
        {
          "id": "cm_txn_123",
          "type": "USAGE_DEDUCTION",
          "amount": "0.00680000",
          "balanceAfter": "245.50000000",
          "description": "AI Model Usage",
          "createdAt": "2026-06-15T11:30:00.000+05:30"
        }
      ]
    },
    "charts": {
      "granularity": "day",
      "usageTrend": [
        {
          "bucket": "2026-06-14T05:30:00.000+05:30",
          "requests": 12,
          "totalTokens": 7000,
          "totalCost": "0.04680000"
        }
      ]
    }
  },
  "message": "Overview fetched successfully"
}
```

Notes:
- this endpoint always returns data for the logged-in user only
- `from` and `to` are only needed when `dateRangePreset=custom`
- date/time values in responses are currently formatted in IST by the backend response formatter
- `topModels`, `topProjects`, and `topApiKeys` are ranked by `totalCost` in the selected date range
- recent wallet transactions are limited to the latest 5 records

---

## 8. Admin User Management APIs

Auth:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Notes:
- these endpoints are admin-only
- mounted under `/admin/users`
- accessible to `Admin` and `SuperAdmin`
- `SuperAdmin` accounts can only be managed by `SuperAdmin`
- `Admin` accounts can only be managed by `SuperAdmin`
- admins cannot manage or delete their own account from these endpoints

### GET `/admin/users`

Get a paginated list of users for the admin panel.

Optional query params:
- `page`
- `pageSize`
- `search`
- `status=ACTIVE|SUSPENDED|INACTIVE`
- `role=User|Admin|SuperAdmin`
- `isDeleted=true|false`

Examples:

```txt
GET /admin/users
GET /admin/users?page=1&pageSize=20
GET /admin/users?search=john
GET /admin/users?status=ACTIVE&role=User
GET /admin/users?isDeleted=true
```

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "id": "cm_user_123",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNo": "9876543210",
        "countryCode": "+91",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "country": "India",
        "profileImage": null,
        "status": "ACTIVE",
        "authProvider": "LOCAL",
        "timezone": "Asia/Kolkata",
        "createdAt": "2026-06-15T10:30:00.000+05:30",
        "updatedAt": "2026-06-18T08:10:00.000+05:30",
        "isDeleted": false,
        "deletedBy": null,
        "userRoles": [
          {
            "role": {
              "id": "cm_role_user",
              "name": "User"
            }
          }
        ],
        "roles": [
          {
            "id": "cm_role_user",
            "name": "User"
          }
        ]
      }
    ]
  },
  "message": "Users fetched successfully"
}
```

Notes:
- search matches `email`, `firstName`, and `lastName`
- default `page` is `1`
- default `pageSize` is `20`
- by default only non-deleted users are returned unless `isDeleted` is provided

### GET `/admin/users/:id`

Get a single user by id for the admin panel.

Response shape:

```json
{
  "status": true,
  "data": {
    "id": "cm_user_123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNo": "9876543210",
    "countryCode": "+91",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "profileImage": null,
    "status": "ACTIVE",
    "authProvider": "LOCAL",
    "timezone": "Asia/Kolkata",
    "createdAt": "2026-06-15T10:30:00.000+05:30",
    "updatedAt": "2026-06-18T08:10:00.000+05:30",
    "isDeleted": false,
    "deletedBy": null,
    "userRoles": [
      {
        "role": {
          "id": "cm_role_user",
          "name": "User"
        }
      }
    ],
    "roles": [
      {
        "id": "cm_role_user",
        "name": "User"
      }
    ]
  },
  "message": "User fetched successfully"
}
```

### PATCH `/admin/users/:id`

Update editable user fields.

Allowed body fields:
- `firstName`
- `lastName`
- `phoneNo`
- `countryCode`
- `city`
- `state`
- `country`
- `timezone`
- `status`

Notes:
- at least one field is required
- nullable string fields may be sent as `null`
- `status` must be one of `ACTIVE`, `SUSPENDED`, or `INACTIVE`

Example body:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "city": "Surat",
  "timezone": "Asia/Kolkata",
  "status": "ACTIVE"
}
```

Response shape:

```json
{
  "status": true,
  "data": {
    "id": "cm_user_123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNo": "9876543210",
    "countryCode": "+91",
    "city": "Surat",
    "state": "Gujarat",
    "country": "India",
    "profileImage": null,
    "status": "ACTIVE",
    "authProvider": "LOCAL",
    "timezone": "Asia/Kolkata",
    "createdAt": "2026-06-15T10:30:00.000+05:30",
    "updatedAt": "2026-06-19T09:20:00.000+05:30",
    "isDeleted": false,
    "deletedBy": null,
    "userRoles": [
      {
        "role": {
          "id": "cm_role_user",
          "name": "User"
        }
      }
    ],
    "roles": [
      {
        "id": "cm_role_user",
        "name": "User"
      }
    ]
  },
  "message": "User updated successfully"
}
```

### DELETE `/admin/users/:id`

Soft delete a user account.

Notes:
- this marks `isDeleted=true`
- it also sets `status=INACTIVE`
- `deletedBy` and `updatedBy` are set to the acting admin id

Response shape:

```json
{
  "status": true,
  "data": {
    "id": "cm_user_123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNo": "9876543210",
    "countryCode": "+91",
    "city": "Surat",
    "state": "Gujarat",
    "country": "India",
    "profileImage": null,
    "status": "INACTIVE",
    "authProvider": "LOCAL",
    "timezone": "Asia/Kolkata",
    "createdAt": "2026-06-15T10:30:00.000+05:30",
    "updatedAt": "2026-06-19T09:25:00.000+05:30",
    "isDeleted": true,
    "deletedBy": "cm_admin_123",
    "userRoles": [
      {
        "role": {
          "id": "cm_role_user",
          "name": "User"
        }
      }
    ],
    "roles": [
      {
        "id": "cm_role_user",
        "name": "User"
      }
    ]
  },
  "message": "User deleted successfully"
}
```

---

## 9. Admin Revenue APIs

Auth:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Notes:
- these endpoints are admin-only
- mounted under `/admin/revenue`
- revenue is calculated from `inference_requests`
- `providerCost` = actual upstream provider spend
- `platformMarkup` = platform-added markup amount
- `totalRevenue` = billed amount charged for requests in the selected range

Common optional query params:
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

Extra query params:
- `granularity=hour|day|week|month` for `/admin/revenue/timeseries`
- `page`
- `pageSize` for grouped endpoints

Supported `dateRangePreset` values:
- `today`
- `past_24h`
- `weekly`
- `monthly`
- `yearly`
- `custom`

Examples:

```txt
GET /admin/revenue/summary?dateRangePreset=weekly
GET /admin/revenue/timeseries?dateRangePreset=monthly&granularity=day
GET /admin/revenue/by-users?dateRangePreset=monthly&page=1&pageSize=10
GET /admin/revenue/by-models?providerId=cm_provider_123&dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-15T23:59:59.000Z
```

### GET `/admin/revenue/summary`

Get aggregate revenue totals for the selected range.

Response shape:

```json
{
  "status": true,
  "data": {
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    },
    "totals": {
      "totalRequests": 42,
      "providerCost": "0.10200000",
      "platformMarkup": "0.03500000",
      "totalRevenue": "0.13700000",
      "averageMarkupPercent": 34.31
    }
  },
  "message": "Admin revenue summary fetched successfully"
}
```

### GET `/admin/revenue/timeseries`

Get revenue chart data for the selected range.

Response shape:

```json
{
  "status": true,
  "data": {
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    },
    "granularity": "day",
    "series": [
      {
        "bucket": "2026-06-14T05:30:00.000+05:30",
        "requests": 12,
        "providerCost": "0.03180000",
        "platformMarkup": "0.01500000",
        "totalRevenue": "0.04680000"
      }
    ]
  },
  "message": "Admin revenue timeseries fetched successfully"
}
```

### GET `/admin/revenue/by-users`

Get grouped revenue by user.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "userId": "cm_user_123",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "ACTIVE",
        "requests": 42,
        "providerCost": "0.10200000",
        "platformMarkup": "0.03500000",
        "totalRevenue": "0.13700000"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin revenue by users fetched successfully"
}
```

### GET `/admin/revenue/by-models`

Get grouped revenue by model.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "modelId": "cm_model_123",
        "slug": "gpt-4o",
        "displayName": "GPT-4o",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 42,
        "providerCost": "0.10200000",
        "platformMarkup": "0.03500000",
        "totalRevenue": "0.13700000"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin revenue by models fetched successfully"
}
```

### GET `/admin/revenue/by-providers`

Get grouped revenue by provider.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "providerId": "cm_provider_123",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 42,
        "providerCost": "0.10200000",
        "platformMarkup": "0.03500000",
        "totalRevenue": "0.13700000"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin revenue by providers fetched successfully"
}
```

### GET `/admin/revenue/by-projects`

Get grouped revenue by project.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "projectId": "cm_project_123",
        "name": "AI Colab Chat",
        "slug": "ai-colab-chat",
        "isActive": true,
        "user": {
          "id": "cm_user_123",
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "requests": 42,
        "providerCost": "0.10200000",
        "platformMarkup": "0.03500000",
        "totalRevenue": "0.13700000"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin revenue by projects fetched successfully"
}
```

### GET `/admin/revenue/by-api-keys`

Get grouped revenue by API key.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "apiKeyId": "cm_key_123",
        "name": "Frontend Key",
        "keyPrefix": "mb_live_xxx",
        "status": "ACTIVE",
        "project": {
          "id": "cm_project_123",
          "name": "AI Colab Chat",
          "slug": "ai-colab-chat"
        },
        "user": {
          "id": "cm_user_123",
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "requests": 42,
        "providerCost": "0.10200000",
        "platformMarkup": "0.03500000",
        "totalRevenue": "0.13700000"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin revenue by API keys fetched successfully"
}
```

Search behavior:
- matches requested model slug
- matches resolved model slug
- matches user email
- matches user first name
- matches user last name
- matches API key name
- matches API key prefix
- matches project name
- matches model display name
- matches provider display name

Notes:
- `page` defaults to `1`
- default `pageSize` is `20`
- max `pageSize` is `100`

---

## 10. Admin Overview API

Auth:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Notes:
- this is the top-level dashboard API for the whole platform
- mounted under `/admin/overview`
- this endpoint is admin-only
- date/time values are formatted by the backend response formatter

### GET `/admin/overview`

Get a single dashboard payload for the admin panel overview page.

Optional query params:
- `dateRangePreset`
- `from`
- `to`

Supported `dateRangePreset` values:
- `today`
- `past_24h`
- `weekly`
- `monthly`
- `yearly`
- `custom`

Examples:

```txt
GET /admin/overview
GET /admin/overview?dateRangePreset=weekly
GET /admin/overview?dateRangePreset=monthly
GET /admin/overview?dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-15T23:59:59.000Z
```

Response sections:
- `summary`
- `usage`
- `charts`
- `topUsers`
- `topModels`
- `topProviders`

Current response also includes:
- `topProjects`
- `apiKeys`
- `wallet`

Response shape:

```json
{
  "status": true,
  "data": {
    "summary": {
      "totalUsers": 120,
      "activeUsers": 102,
      "suspendedUsers": 8,
      "inactiveUsers": 10,
      "totalProjects": 86,
      "activeProjects": 74,
      "totalApiKeys": 143,
      "activeApiKeys": 131,
      "totalProviders": 6,
      "activeProviders": 4,
      "totalModels": 58,
      "activeModels": 52,
      "totalWallets": 110,
      "activeWallets": 107,
      "totalWalletBalance": "1250.50000000",
      "totalRequests": 4210,
      "totalTokens": 1840200,
      "totalRevenue": "55.49000000",
      "totalProviderCost": "193.42000000",
      "totalBilledAmount": "248.91000000",
      "successRate": 94.82,
      "avgLatencyMs": 641.2
    },
    "usage": {
      "requestsByStatus": {
        "success": 3992,
        "failed": 121,
        "stopped": 56,
        "pending": 17,
        "partial": 24
      },
      "tokensBreakdown": {
        "prompt": 1100000,
        "completion": 740200,
        "total": 1840200
      },
      "costBreakdown": {
        "totalProviderCost": "193.42000000",
        "totalRevenue": "55.49000000",
        "totalBilledAmount": "248.91000000"
      },
      "streamVsNonStream": {
        "stream": 1620,
        "nonStream": 2590
      },
      "dateRange": {
        "preset": "weekly",
        "from": "2026-06-08T15:30:00.000+05:30",
        "to": "2026-06-15T12:45:00.000+05:30"
      }
    },
    "topUsers": [
      {
        "userId": "cm_user_123",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "ACTIVE",
        "requests": 420,
        "totalTokens": 184000,
        "totalCost": "24.81000000"
      }
    ],
    "topModels": [
      {
        "modelId": "cm_model_123",
        "slug": "gpt-4o",
        "displayName": "GPT-4o",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 980,
        "totalTokens": 420000,
        "totalCost": "61.32000000"
      }
    ],
    "topProviders": [
      {
        "providerId": "cm_provider_123",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 1880,
        "totalTokens": 790000,
        "totalCost": "112.54000000"
      }
    ],
    "charts": {
      "granularity": "day",
      "usageTrend": [
        {
          "bucket": "2026-06-14T05:30:00.000+05:30",
          "requests": 612,
          "totalTokens": 270000,
          "providerCost": "28.40000000",
          "revenue": "8.20000000",
          "totalBilledAmount": "36.60000000"
        }
      ]
    }
  },
  "message": "Admin overview fetched successfully"
}
```

Recommended dashboard mapping:
- `summary` covers top-level counts and KPIs
- `usage.requestsByStatus` covers request quality mix
- `usage.tokensBreakdown` covers prompt/completion/total token totals
- `usage.costBreakdown` covers provider cost, platform revenue, and billed amount
- `charts.usageTrend` can be used for both usage trend and revenue trend visualizations
- `topUsers` supports top users by spend
- `topModels` supports top models by usage
- `topProviders` supports top providers by usage

---

## 11. Admin Activity APIs

Auth:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Notes:
- these endpoints are admin-only
- mounted under `/admin/activity`
- data is grouped from `inference_requests` for the selected filter range
- all date/time values are returned through the backend formatter

Common optional query params for all endpoints:
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
- `page`
- `pageSize`

Supported `dateRangePreset` values:
- `today`
- `past_24h`
- `weekly`
- `monthly`
- `yearly`
- `custom`

Supported `status` values:
- `SUCCESS`
- `FAILED`
- `STOPPED`
- `PENDING`
- `PARTIAL`

Examples:

```txt
GET /admin/activity/by-users?dateRangePreset=weekly
GET /admin/activity/by-models?providerId=cm_provider_123&dateRangePreset=monthly
GET /admin/activity/by-projects?status=SUCCESS&page=1&pageSize=10
GET /admin/activity/by-api-keys?search=frontend&dateRangePreset=custom&from=2026-06-01T00:00:00.000Z&to=2026-06-15T23:59:59.000Z
```

### GET `/admin/activity/by-users`

Get grouped activity by user for the selected range.

Response shape:

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
        "userId": "cm_user_123",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "ACTIVE",
        "requests": 42,
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
        "averageResponseCompletionTimeMs": 1880.2,
        "firstActivityAt": "2026-06-08T15:30:00.000+05:30",
        "lastActivityAt": "2026-06-15T12:45:00.000+05:30"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin activity by users fetched successfully"
}
```

### GET `/admin/activity/by-models`

Get grouped activity by model.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "modelId": "cm_model_123",
        "slug": "gpt-4o",
        "displayName": "GPT-4o",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 42,
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
        "averageResponseCompletionTimeMs": 1880.2,
        "firstActivityAt": "2026-06-08T15:30:00.000+05:30",
        "lastActivityAt": "2026-06-15T12:45:00.000+05:30"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin activity by models fetched successfully"
}
```

### GET `/admin/activity/by-providers`

Get grouped activity by provider.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "providerId": "cm_provider_123",
        "provider": {
          "id": "cm_provider_123",
          "slug": "openai",
          "displayName": "OpenAI"
        },
        "requests": 42,
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
        "averageResponseCompletionTimeMs": 1880.2,
        "firstActivityAt": "2026-06-08T15:30:00.000+05:30",
        "lastActivityAt": "2026-06-15T12:45:00.000+05:30"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin activity by providers fetched successfully"
}
```

### GET `/admin/activity/by-projects`

Get grouped activity by project.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "projectId": "cm_project_123",
        "name": "AI Colab Chat",
        "slug": "ai-colab-chat",
        "isActive": true,
        "user": {
          "id": "cm_user_123",
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "requests": 42,
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
        "averageResponseCompletionTimeMs": 1880.2,
        "firstActivityAt": "2026-06-08T15:30:00.000+05:30",
        "lastActivityAt": "2026-06-15T12:45:00.000+05:30"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin activity by projects fetched successfully"
}
```

### GET `/admin/activity/by-api-keys`

Get grouped activity by API key.

Response shape:

```json
{
  "status": true,
  "data": {
    "currentPage": 1,
    "pageSize": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "data": [
      {
        "apiKeyId": "cm_key_123",
        "name": "Frontend Key",
        "keyPrefix": "mb_live_xxx",
        "status": "ACTIVE",
        "project": {
          "id": "cm_project_123",
          "name": "AI Colab Chat",
          "slug": "ai-colab-chat"
        },
        "user": {
          "id": "cm_user_123",
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "requests": 42,
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
        "averageResponseCompletionTimeMs": 1880.2,
        "firstActivityAt": "2026-06-08T15:30:00.000+05:30",
        "lastActivityAt": "2026-06-15T12:45:00.000+05:30"
      }
    ],
    "range": {
      "from": "2026-06-08T15:30:00.000+05:30",
      "to": "2026-06-15T12:45:00.000+05:30",
      "preset": "weekly"
    }
  },
  "message": "Admin activity by API keys fetched successfully"
}
```

Search behavior:
- matches requested model slug
- matches resolved model slug
- matches user email
- matches user first name
- matches user last name
- matches API key name
- matches API key prefix
- matches project name
- matches model display name
- matches provider display name

Notes:
- `page` defaults to `1`
- default `pageSize` is `20`
- max `pageSize` is `100`
- provider grouping is aggregated from model-level usage linked to providers

---

## 11. Providers APIs

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

## 12. Chat Completions API

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

## 13. Root / Health

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
