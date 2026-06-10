# Model Bridge CMS — Project Context

## What This Project Is

Model Bridge CMS is a **unified LLM API gateway and management dashboard**. It lets users (and organizations) access multiple LLM providers (OpenAI, Anthropic, Google, etc.) through a single API key, track usage, manage credits, and view analytics — similar to OpenRouter or Azure OpenAI, but self-hosted.

The project has two services:
- **backend/** — Express.js REST API (Node.js + TypeScript + Prisma + PostgreSQL)
- **frontend/** — Next.js 15 dashboard (React 19 + Tailwind + shadcn/ui)

---

## Tech Stack

### Backend
| Layer | Choice |
|---|---|
| Framework | Express.js v5 |
| Language | TypeScript 6 (strict mode) |
| Database | PostgreSQL via Prisma v7 |
| Auth | JWT (jsonwebtoken v9) + bcryptjs |
| Validation | Zod v4 |
| Security | helmet, xss sanitizer, CORS |
| Dev runtime | tsx (ts-node replacement) |

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Radix UI + shadcn/ui + Tailwind CSS v4 |
| State (server) | TanStack React Query v5 |
| State (client) | Zustand v5 with localStorage persist |
| Forms | react-hook-form v7 + Zod v4 |
| HTTP client | axios v1 (with JWT interceptors) |
| Charts | recharts v3 |
| Tables | TanStack Table v8 |
| Notifications | sonner v2 (toast) |
| Theme | next-themes (light/dark) |

---

## Project Structure

```
model-bridge-cms/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app + middleware stack
│   │   ├── index.ts            # Server entry (listens on PORT)
│   │   ├── routes.ts           # Root router — mounts all modules
│   │   ├── modules/            # Feature modules (MVC pattern)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── api-keys/
│   │   │   ├── wallets/
│   │   │   ├── billing/
│   │   │   ├── payment/
│   │   │   ├── pricing/
│   │   │   ├── models/
│   │   │   ├── providers/
│   │   │   ├── routing/
│   │   │   ├── completions/
│   │   │   ├── embeddings/
│   │   │   ├── images/
│   │   │   ├── usage/
│   │   │   ├── analytics/
│   │   │   ├── rate-limit/
│   │   │   ├── webhooks/
│   │   │   ├── notifications/
│   │   │   ├── admin/
│   │   │   ├── audit-logs/
│   │   │   └── settings/
│   │   ├── shared/
│   │   │   ├── middlewares/    # errorHandler, notFoundHandler, sanitize, validate
│   │   │   ├── constants/
│   │   │   ├── database/
│   │   │   ├── errors/
│   │   │   ├── logger/
│   │   │   ├── redis/
│   │   │   └── types/
│   │   └── utils/
│   │       ├── paginationUtils.ts
│   │       ├── responseUtils.ts
│   │       ├── serverConfig.ts
│   │       └── statusCodes.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seeds/
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── app/
    │   ├── layout.tsx          # Root HTML shell + Providers
    │   ├── page.tsx            # Landing page (/)
    │   ├── providers.tsx       # ThemeProvider + QueryClientProvider + Toaster
    │   ├── globals.css
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx      # Sidebar + breadcrumb shell
    │   │   ├── page.tsx        # /dashboard — overview stats
    │   │   ├── keys/page.tsx   # /dashboard/keys — API key management
    │   │   ├── usage/page.tsx  # /dashboard/usage — usage logs table
    │   │   ├── stats/page.tsx  # /dashboard/stats — analytics charts
    │   │   └── credits/page.tsx # /dashboard/credits — wallet & transactions
    │   └── admin/
    │       ├── credits/
    │       ├── models/
    │       ├── providers/
    │       ├── statistics/
    │       └── users/
    ├── components/
    │   ├── ui/                 # shadcn/ui primitives (30+ components)
    │   ├── layout/             # Sidebar shell (app-sidebar, nav-main, nav-user, team-switcher, etc.)
    │   ├── charts/             # DailySpendChart, ModelPieChart, chart-area-interactive
    │   ├── forms/              # login-form, signup-form, keys/ (CreateKeyModal, EditKeyModal, OneTimeKeyDisplay)
    │   ├── shared/             # Navbar, data-table, section-cards
    │   └── landingPage/        # HeroSection
    ├── lib/
    │   ├── api.ts              # Axios instance with JWT interceptors
    │   ├── queryClient.ts      # React Query config (1min stale, 1 retry)
    │   └── utils.ts            # cn() classname helper
    ├── store/
    │   └── authStore.ts        # Zustand auth store (persisted to localStorage)
    ├── hooks/
    │   └── use-mobile.ts
    └── types/
        └── index.ts            # All shared TypeScript interfaces
```

---

## What Is DONE (Completed)

### Backend — Scaffolding Complete

**App infrastructure:**
- Express app with full middleware stack: CORS, Helmet, compression, JSON parsing, XSS sanitizer, centralized error handler, 404 handler
- Health check endpoint: `GET /health` → `{ status: "ok", timestamp }`
- Standardized response format via `sendResponse()`: `{ status: boolean, data: any, message: string }`
- Zod validation middleware (`validate.ts`) — wraps any Zod schema into Express middleware
- XSS sanitizer middleware (`sanitize.ts`) — recursively sanitizes req.body, query, params, headers
- Path aliases: `@/*`, `@modules/*`, `@utils/*`, `@validators/*`

**Module scaffolding (all 21 modules exist with consistent structure):**
Every module has been created with these 5 files:
- `module.controller.ts`
- `module.route.ts`
- `module.service.ts`
- `module.types.ts`
- `module.validators.ts`

**Database:**
- Prisma configured with PostgreSQL + `@prisma/adapter-pg`
- `user` model exists in schema with: id (uuid), firstName, lastName, email (unique), password, phoneno, city, state, country, createdAt, updatedAt

**Auth module:**
- Login Zod validator schema defined: `{ email: string, password: string }`
- Route: `POST /auth/login` wired with validator middleware

### Backend — NOT Yet Implemented

- All service/controller logic (empty functions)
- All database models beyond `user` (ApiKey, UsageLog, CreditTransaction, Model, Provider, etc.)
- JWT generation and validation
- Auth middleware (protecting routes)
- Register endpoint
- Token refresh endpoint
- Any actual business logic

---

### Frontend — Largely Complete UI

**Landing page (`/`):**
- Navbar with logo, search, nav links, sign-up CTA, user avatar (when logged in)
- HeroSection: headline "The Unified Interface For LLMs", tagline, two CTA buttons, stats grid (100T tokens, 8M+ users, 60+ providers, 400+ models)

**Auth pages:**
- `/auth/login` — 2-column layout with LoginForm (email, password, forgot password, GitHub OAuth button, sign-up link)
- `/auth/register` — same layout with SignupForm (full name, email, password, confirm password, GitHub OAuth, sign-in link)
- **⚠️ NOT connected to backend** — forms have no onSubmit handlers

**Dashboard layout (`/dashboard/*`):**
- Collapsible sidebar with icon mode
- Sidebar navigation: Overview, API Management (API Keys + Usage Logs), Analytics (Statistics), Credits & Wallet
- Breadcrumb header that auto-generates from pathname
- `useAuthStore` referenced but auth guard currently commented out

**Dashboard pages — all have full UI + React Query data fetching:**

| Page | URL | What it shows | API endpoint it calls |
|---|---|---|---|
| Overview | /dashboard | 4 stat cards (requests, tokens, spend, active keys) | `GET /api/v1/usage/stats` |
| API Keys | /dashboard/keys | Key table + create/edit/rotate/revoke modals | `GET/POST/DELETE/PATCH /api/v1/keys` |
| Usage Logs | /dashboard/usage | Filterable, sortable, expandable log table | `GET /api/v1/usage` |
| Statistics | /dashboard/stats | 5 stat cards + daily spend bar chart + model pie chart + tables | `GET /api/v1/usage/stats` |
| Credits | /dashboard/credits | Balance card + transaction history table + top-up modal | `GET /api/v1/credits/balance` + `GET /api/v1/credits/transactions` |

**Key UI features built:**
- Skeleton loaders during data fetch
- Empty states with icons
- Sortable table columns (usage logs)
- Expandable rows with detail panel (usage logs)
- Pagination with page size selector (usage logs, credits)
- Date range presets: 7d, 30d, 90d, Custom (with custom date inputs)
- Transaction type badges with semantic colors
- Copy-to-clipboard for API keys (with checkmark feedback)
- One-time key display with "I've saved my key" confirmation
- Status badges (ACTIVE/REVOKED/EXPIRED, SUCCESS/FAILED/PARTIAL)
- USD formatting and token count formatting

**Admin pages (routes exist, content unknown):**
- `/admin/credits`, `/admin/models`, `/admin/providers`, `/admin/statistics`, `/admin/users`

**Global infrastructure:**
- Axios instance with base URL from `NEXT_PUBLIC_API_URL` env var
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: on 401, calls `POST /auth/refresh`, retries once, redirects to `/login` on failure
- React Query: 1-min stale time, 1 retry, no refetch on window focus
- Zustand auth store: persisted to localStorage key `"auth-storage"`, holds user + accessToken + refreshToken
- Providers tree: `ThemeProvider` > `QueryClientProvider` > `TooltipProvider` > `Toaster`

---

## API Contract (Frontend expects these endpoints)

All endpoints are prefixed with the base URL from `NEXT_PUBLIC_API_URL`.

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| POST | /auth/login | Login | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| POST | /auth/register | Register | `{ name, email, password }` | `{ user, accessToken, refreshToken }` |
| POST | /auth/refresh | Refresh token | header: `refresh_token` | `{ accessToken }` |
| GET | /api/v1/keys | List API keys | — | `ApiKey[]` |
| POST | /api/v1/keys | Create key | `{ name, scopes, rateLimit, monthlyLimit? }` | `{ key: string, ...ApiKey }` |
| PATCH | /api/v1/keys/:id | Edit key | `{ name, scopes, rateLimit, monthlyLimit? }` | `ApiKey` |
| DELETE | /api/v1/keys/:id | Revoke key | — | — |
| POST | /api/v1/keys/:id/rotate | Rotate key | — | `{ key: string }` |
| GET | /api/v1/usage | Usage logs | `{ page, limit, startDate, endDate, model, status, capability, apiKeyId, sortBy, sortOrder }` | `{ logs: UsageLogItem[], total, page, limit }` |
| GET | /api/v1/usage/:id | Usage log detail | — | `UsageLogDetail` |
| GET | /api/v1/usage/stats | Stats summary | `{ startDate, endDate, groupBy }` | `StatsResponse` |
| GET | /api/v1/credits/balance | Wallet balance | — | `{ balance: string }` |
| GET | /api/v1/credits/transactions | Transaction history | `{ page, limit, startDate, endDate, type }` | `{ transactions: Transaction[], total, page, limit }` |

---

## Key TypeScript Interfaces (from frontend/types/index.ts)

```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "USER" | "ADMIN"
  creditBalance: number
}

interface ApiKey {
  id: string
  keyPrefix: string
  name: string
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  scopes: string[]         // e.g. ["FULL", "CHAT"]
  rateLimit: number
  lastUsedAt?: string
  createdAt: string
}

interface UsageLogItem {
  id: string
  requestId: string
  timestamp: string
  model: string
  apiKeyPrefix: string
  capability: string
  status: "SUCCESS" | "FAILED" | "PARTIAL" | "PENDING"
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: string
  latencyMs: number
}

interface UsageLogDetail extends UsageLogItem {
  finishReason?: string
  errorMessage?: string
}

interface StatsResponse {
  summary: {
    totalRequests: number
    successfulRequests: number
    totalTokens: number
    totalSpendUsd: number
    avgLatencyMs: number
  }
  dailySpend: { date: string; costUsd: number }[]
  modelBreakdown: { model: string; requestCount: number; totalTokens: number; totalCostUsd: number }[]
  keyBreakdown: { keyPrefix: string; requestCount: number; totalCostUsd: number }[]
}

interface Transaction {
  id: string
  type: "PURCHASE" | "GRANT" | "DEDUCTION" | "REFUND" | "ADJUSTMENT"
  amount: string          // USD string e.g. "10.00"
  balanceBefore: string
  balanceAfter: string
  description?: string
  usageLogId?: string
  createdAt: string
}
```

---

## Response Format Convention

All backend responses must follow:
```json
{
  "status": true,
  "data": { ... },
  "message": "Success"
}
```

Errors:
```json
{
  "status": false,
  "data": null,
  "message": "Error description"
}
```

---

## Environment Variables

### Backend
```
DATABASE_URL=postgresql://...
PORT=3001
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## What To Work On Next

### High Priority (unblocks frontend)
1. **Backend: User model + Auth** — implement register, login, JWT generation, refresh
2. **Backend: ApiKey model + CRUD** — the keys page is fully built and waiting
3. **Backend: Prisma migrations** — add all missing models (ApiKey, UsageLog, CreditTransaction, Model, Provider)
4. **Frontend: Wire login/signup forms** — add onSubmit handlers calling the auth endpoints
5. **Frontend: Protected routes** — uncomment/implement auth guard in dashboard layout

### Medium Priority
6. **Backend: Usage logging** — POST endpoint called by the proxy layer to store logs
7. **Backend: Stats aggregation** — aggregate UsageLogs for the stats/overview endpoints
8. **Backend: Credits system** — balance + transaction endpoints
9. **Frontend: Admin pages** — build out the admin section pages

### Lower Priority
10. **Backend: Proxy layer** — the actual completions/embeddings routing to providers
11. **Backend: Rate limiting** — enforce per-key rate limits
12. **Backend: Webhooks, notifications, audit logs**
