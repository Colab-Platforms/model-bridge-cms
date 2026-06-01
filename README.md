# Model Bridge

> An AI gateway platform with a modular backend architecture and Next.js frontend.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
	- [Prerequisites](#prerequisites)
	- [Backend Setup](#backend-setup)
	- [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Project Structure](#project-structure)
- [Providers](#providers)
- [License](#license)

---

## Overview

**Model Bridge** is a full-stack project composed of:

- A modular **Express + TypeScript** backend API gateway
- A **Next.js 16 + React 19** frontend
- A provider-ready architecture for multi-model AI integrations

The backend is organized by domain modules and shared infrastructure layers so you can scale features without coupling core concerns.

---

## Features

- Modular backend route system (`auth`, `users`, `billing`, `models`, `providers`, etc.)
- Shared layers for database, logging, errors, middleware, redis, constants, and utility helpers
- Provider abstraction folders for OpenAI, Anthropic, Gemini, Groq, Mistral, and Deepseek
- Schema-based validation support using Zod
- Security middleware: Helmet, CORS, XSS sanitization, compression
- Prisma integration for database workflows and seeding
- Next.js frontend ready for API integration

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 16.2.6, React 19.2.4, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Validation | Zod |
| Database | Prisma 7 + PostgreSQL |
| Auth Utilities | bcryptjs, jsonwebtoken |
| Security | Helmet, CORS, XSS sanitization, compression |

---

## Architecture

```text
model-bridge/
├── backend/         # Express API gateway (TypeScript)
│   ├── prisma/      # Prisma schema + seeds
│   └── src/
│       ├── modules/ # Domain modules
│       ├── providers/
│       ├── shared/
│       ├── utils/
│       ├── app.ts
│       ├── routes.ts
│       └── index.ts
└── frontend/        # Next.js app (App Router)
		└── app/
```

The backend exposes API routes under `/api/*` and a direct health endpoint at `/health`.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- PostgreSQL (recommended for backend database workflows)

---

### Backend Setup

```bash
cd backend

# 1) Install dependencies
npm install

# 2) Configure environment variables
# Create backend/.env and add required values

# 3) Prisma workflows (as needed)
npm run db:generate
npm run db:migrate
npm run db:seed

# 4) Start backend
npm run dev
```

Default backend URL: `http://localhost:5000`

---

### Frontend Setup

```bash
cd frontend

# 1) Install dependencies
npm install

# 2) Configure environment variables
# Create frontend/.env.local and add required values

# 3) Start frontend
npm run dev
```

Default frontend URL: `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

Add values based on your environment:

- `PORT` (optional, defaults to `5000`)
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- Provider keys as needed

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` (example: `http://localhost:5000/api`)

---


Health check:

- `/health`

---

## Project Structure

```text
backend/src/
├── app.ts
├── index.ts
├── routes.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── api-keys/
│   ├── wallets/
│   ├── billing/
│   ├── payment/
│   ├── pricing/
│   ├── models/
│   ├── providers/
│   ├── routing/
│   ├── completions/
│   ├── embeddings/
│   ├── images/
│   ├── usage/
│   ├── analytics/
│   ├── rate-limit/
│   ├── webhooks/
│   ├── notifications/
│   ├── admin/
│   ├── audit-logs/
│   ├── settings/
│   └── health/
├── providers/
│   ├── openai/
│   ├── anthropic/
│   ├── gemini/
│   ├── groq/
│   ├── mistral/
│   └── deepseek/
├── shared/
│   ├── database/
│   ├── redis/
│   ├── logger/
│   ├── errors/
│   ├── constants/
│   ├── middlewares/
│   ├── utils/
│   └── types/
└── utils/

frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
└── public/
```

---

## Providers

Provider-specific integrations should live under:

- `backend/src/providers/openai`
- `backend/src/providers/anthropic`
- `backend/src/providers/gemini`
- `backend/src/providers/groq`
- `backend/src/providers/mistral`
- `backend/src/providers/deepseek`

Recommendation: keep a unified provider interface in shared types and make each provider adapter conform to it.

---

