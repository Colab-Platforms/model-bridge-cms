"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Copy, Check, Search, X, ExternalLink,
  Package, Globe, Zap, Layers, Shield, RefreshCw, AlertTriangle, Box,
  Cpu, GitBranch, Boxes, MessageSquare, Bot, Workflow, Clock,
  Terminal, Puzzle, MousePointer2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landingPage/Footer";

// ── Syntax colours for dark code blocks ───────────────────────────────────────
const SYN = {
  keyword: "#818CF8",
  string: "#86EFAC",
  comment: "#64748B",
  type: "#7DD3FC",
  number: "#FCA5A5",
  plain: "#E2E8F0",
} as const;

// ── Language tab system ───────────────────────────────────────────────────────
type LangTab = "typescript" | "python" | "go" | "java";

const LANG_TABS: { id: LangTab; label: string; badge?: string; color: string }[] = [
  { id: "typescript", label: "TypeScript", color: "text-sky-400" },
  { id: "python",     label: "Python",     color: "text-yellow-400" },
  { id: "go",         label: "Go",         badge: "soon", color: "text-cyan-400" },
  { id: "java",       label: "Java",       badge: "soon", color: "text-orange-400" },
];

// ── Single source of truth — drives both left nav and right TOC ───────────────
const SECTIONS = [
  {
    group: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "installation", label: "Installation" },
      { id: "quickstart",   label: "Quick Start" },
    ],
  },
  {
    group: "Core Concepts",
    items: [
      { id: "features",      label: "Features" },
      { id: "configuration", label: "Configuration" },
      { id: "architecture",  label: "Architecture" },
      { id: "environments",  label: "Environments" },
    ],
  },
  {
    group: "SDK Reference",
    items: [
      { id: "sdk-model-field",  label: "model Field" },
      { id: "chat",             label: "Chat Completions" },
      { id: "multimodel",       label: "Multi-Model Requests" },
      { id: "streaming",        label: "Streaming" },
      { id: "platform-models",  label: "Listing Models" },
      { id: "usage",            label: "Usage Records" },
      { id: "credits",          label: "Credits" },
    ],
  },
  {
    group: "Integrations",
    items: [
      { id: "integrations-overview", label: "Overview" },
      { id: "integration-cline",       label: "Cline" },
      { id: "integration-roo-code",    label: "Roo Code" },
      { id: "integration-kilo-code",   label: "Kilo Code" },
      { id: "integration-cursor",      label: "Cursor" },
      { id: "integration-copilot",     label: "GitHub Copilot" },
      { id: "integration-codex",       label: "Codex CLI" },
      { id: "integration-gemini-cli",  label: "Gemini CLI" },
      { id: "integration-continue",    label: "Continue" },
      { id: "integration-opencode",    label: "OpenCode" },
      { id: "integration-droid",       label: "Droid" },
      { id: "integration-antigravity", label: "Antigravity" },
      { id: "integration-claude-code", label: "Claude Code" },
    ],
  },
  {
    group: "Platform Features",
    items: [
      { id: "platform-overview", label: "Platform Overview" },
      { id: "chatbot-agents",    label: "Chatbots & Agents" },
      { id: "multimodel-agents", label: "Multi-Model Agents" },
      { id: "guardrails",        label: "Guardrails" },
    ],
  },
  {
    group: "Advanced",
    items: [
      { id: "errors",      label: "Error Handling" },
      { id: "advanced",    label: "Advanced Usage" },
      { id: "sdks",        label: "SDK Reference" },
    ],
  },
];

const FLAT_SECTIONS = SECTIONS.flatMap(s => s.items);

// ── Install commands ──────────────────────────────────────────────────────────
const INSTALL_PKG: Record<string, string> = {
  npm:  "npm install @colab-one/sdk",
  pnpm: "pnpm add @colab-one/sdk",
  yarn: "yarn add @colab-one/sdk",
  bun:  "bun add @colab-one/sdk",
};

const INSTALL_PYTHON = `pip install colab-one-sdk`;

// ── Code samples: TypeScript + Python ─────────────────────────────────────────
const CODES: Record<string, Record<LangTab, string | null>> = {
  quickstart: {
    typescript: `import { ColabOne } from "@colab-one/sdk";

const client = new ColabOne({
  apiKey: process.env.COLABONE_API_KEY,
});

// Single model request
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: "Hello, ColabOne!" },
  ],
});

console.log(response.choices[0].message.content);`,
    python: `import asyncio
import os
from colab_one_sdk import ColabOne

client = ColabOne(
    api_key=os.environ.get("COLABONE_API_KEY", "mb_your_api_key"),
    timeout=30.0,
    max_retries=3,
)

async def main():
    # Single model request
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user",   "content": "Hello, ColabOne!"},
        ],
    )
    print(response.choices[0].message.content)
    await client.close()

asyncio.run(main())`,
    go:   null,
    java: null,
  },

  model_field: {
    typescript: `// ✅ Correct — single model name string
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

// ✅ Correct — multi-model parallel routing (runs all in parallel)
const multi = await client.chat.completions.create({
  model: ["gpt-4o", "claude-3-5-sonnet", "gemini-2-flash"],
  messages: [{ role: "user", content: "What is the capital of France?" }],
});`,
    python: `# ✅ Correct — single model name string
response = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)

# ✅ Correct — multi-model parallel routing (runs all in parallel)
multi = await client.chat.completions.create(
    model=["gpt-4o", "claude-3-5-sonnet", "gemini-2-flash"],
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)`,
    go:   null,
    java: null,
  },

  chat: {
    typescript: `const response = await client.chat.completions.create({
  model: "gpt-4o",             // single model name string
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: "Explain async iterators in JavaScript." },
  ],
  temperature: 0.7,
  max_tokens: 1024,
  modalities: ["text"],        // optional — "text" | "image" (model-dependent)
});

const message = response.choices[0].message;
console.log(message.role);     // "assistant"
console.log(message.content);  // "Async iterators allow..."

// Usage metadata on every response
console.log(response.usage.prompt_tokens);     // 24
console.log(response.usage.completion_tokens); // 152`,
    python: `response = await client.chat.completions.create(
    model="gpt-4o",      // single model name string
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": "Explain async iterators in Python."},
    ],
    temperature=0.7,
    max_tokens=1024,
    modalities=["text"],   # optional — "text" | "image" (model-dependent)
)

message = response.choices[0].message
print(message.role)     # "assistant"
print(message.content)  # "Async iterators allow..."

# Usage metadata on every response
print(response.usage.prompt_tokens)     # 24
print(response.usage.completion_tokens) # 152`,
    go:   null,
    java: null,
  },

  multimodel: {
    typescript: `// Send the same prompt to multiple models simultaneously.
// All models execute in parallel — ColabOne handles routing.
const result = await client.chat.completions.create({
  model: ["gpt-4o", "claude-3-5-sonnet", "gemini-2-flash"],
  messages: [{ role: "user", content: "Summarise the history of the internet." }],
  temperature: 0.5,
  modalities: ["text"],  // optional output modalities
});

console.log(result.object);               // "chat.completion.group"
console.log(result.summary.totalModels);  // 3

result.results.forEach(r => {
  console.log(r.model);   // "gpt-4o" | "claude-3-5-sonnet" | "gemini-2-flash"
  console.log(r.status);  // "success" | "failed" | "timeout"
  if (r.status === "success") {
    console.log(r.content);    // response text
    console.log(r.latencyMs);  // per-model latency
    console.log(r.billing);    // per-model cost
  }
});

console.log(result.summary.billing.totalCost);`,
    python: `# Send the same prompt to multiple models simultaneously.
# All models execute in parallel — ColabOne handles routing.
result = await client.chat.completions.create(
    model=["gpt-4o", "claude-3-5-sonnet", "gemini-2-flash"],
    messages=[{"role": "user", "content": "Summarise the history of the internet."}],
    temperature=0.5,
    modalities=["text"],   # optional — "text" | "image" (model-dependent)
)

print(result.object)               # "chat.completion.group"
print(result.summary.total_models) # 3

for r in result.results:
    print(r.model)   # "gpt-4o" | "claude-3-5-sonnet" | "gemini-2-flash"
    print(r.status)  # "success" | "failed" | "timeout"
    if r.status == "success":
        print(r.content)     # response text
        print(r.latency_ms)  # per-model latency
        print(r.billing)     # per-model cost

print(result.summary.billing.total_cost)`,
    go:   null,
    java: null,
  },

  agent: {
    typescript: `import { ColabOne } from "@colab-one/sdk";

const client = new ColabOne({ apiKey: process.env.COLABONE_API_KEY });

const history = [
  { role: "system" as const, content: "You are a helpful coding assistant." },
];

async function chat(userMessage: string) {
  history.push({ role: "user", content: userMessage });

  // Fan out to multiple models; pick fastest success
  const result = await client.chat.completions.create({
    model: ["gpt-4o-mini", "claude-3-haiku", "gemini-2-flash"],
    messages: history,
  });

  const best = result.results.find(r => r.status === "success");
  if (!best || typeof best.content !== "string") throw new Error("All models failed");

  history.push({ role: "assistant", content: best.content });
  return { text: best.content, model: best.model, latencyMs: best.latencyMs };
}

const reply = await chat("How do I debounce a function?");
console.log(reply.text);   // answer from fastest model
console.log(reply.model);  // which model answered`,
    python: `import asyncio
import os
from colab_one_sdk import ColabOne

client = ColabOne(
    api_key=os.environ.get("COLABONE_API_KEY", "mb_your_api_key"),
    timeout=30.0,
    max_retries=3,
)

history = [{"role": "system", "content": "You are a helpful coding assistant."}]

async def chat(user_message: str):
    history.append({"role": "user", "content": user_message})

    # Fan out to multiple models; pick fastest success
    result = await client.chat.completions.create(
        model=["gpt-4o-mini", "claude-3-haiku", "gemini-2-flash"],
        messages=history,
    )

    best = next((r for r in result.results if r.status == "success"), None)
    if not best:
        raise ValueError("All models failed")

    history.append({"role": "assistant", "content": best.content})
    return {"text": best.content, "model": best.model, "latency_ms": best.latency_ms}

async def main():
    reply = await chat("How do I debounce a function?")
    print(reply["text"])   # answer from fastest model
    print(reply["model"])  # which model answered
    await client.close()

asyncio.run(main())`,
    go:   null,
    java: null,
  },

  streaming: {
    typescript: `// Streaming is supported for single-model requests
const stream = await client.chat.completions.create({
  model: "claude-3-5-sonnet",
  messages: [{ role: "user", content: "Write a haiku about APIs." }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}

// Note: Streaming with multiple models is not available yet, but will be available soon.
// Use stream: false for multi-model requests.`,
    python: `import asyncio
import os
from colab_one_sdk import ColabOne

client = ColabOne(api_key=os.environ.get("COLABONE_API_KEY", "mb_your_api_key"))

async def main():
    # Streaming is supported for single-model requests
    stream = await client.chat.completions.create(
        model="claude-3-5-sonnet",
        messages=[{"role": "user", "content": "Write a haiku about APIs."}],
        stream=True,
    )

    async for chunk in stream:
        content = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
        if content:
            print(content, end="", flush=True)

    print()
    await client.close()
    # Note: Streaming with multiple models is not available yet, but will be available soon.
    # Use stream=False for multi-model requests.

asyncio.run(main())`,
    go:   null,
    java: null,
  },

  platform_models: {
    typescript: `// List all available models on the platform
const { data: models } = await client.models.list();

// Filter by provider
const anthropicModels = models.filter(m => m.provider === "anthropic");

// Retrieve a specific model's details and pricing
const model = await client.models.retrieve("gpt-4o");
console.log(model.pricing.inputPricePerToken);   // "$2.50"
console.log(model.pricing.outputPricePerToken);  // "$10.00"
console.log(model.contextLength);             // 128000`,
    python: `# List all available models on the platform
models = await client.models.list(limit=10, offset=0)

# Filter by provider
anthropic_models = [m for m in models.data if m.provider == "anthropic"]

# Retrieve a specific model's details and pricing
model = await client.models.retrieve("gpt-4o")
print(model.pricing.input_per_million)   # "$2.50"
print(model.pricing.output_per_million)  # "$10.00"
print(model.context_length)              # 128000`,
    go:   null,
    java: null,
  },

  config: {
    typescript: `const client = new ColabOne({
  apiKey: "mb_...",        // Your ColabOne API key (required)
  baseURL: "https://...",  // Custom base URL (optional)
  timeout: 30_000,         // Request timeout in ms (default: 60 000)
  maxRetries: 3,           // Max retry attempts (default: 2)
  defaultHeaders: {
    "X-Custom-Header": "value",
  },
});`,
    python: `from colab_one_sdk import ColabOne

client = ColabOne(
    api_key="mb_...",                                   # required
    base_url="https://custom.api.colabone.ai/v1",    # optional
    timeout=30.0,          # seconds (default: 60.0)
    max_retries=3,         # default: 3
)

# Print current client config
print(client.get_config())

# Always close the client when done
await client.close()`,
    go:   null,
    java: null,
  },

  usage: {
    typescript: `const { data: records } = await client.usage.list({
  startDate: "2024-01-01",
  endDate:   "2024-01-31",
  limit: 50,
});

const stats = await client.usage.stats({ period: "30d" });
console.log(stats.totalTokens, stats.totalCostUsd);`,
    python: `# Get usage history
history = await client.usage.list(
    start_date="2024-01-01",
    end_date="2024-01-31",
    limit=100,
    offset=0,
)
print("Usage history:", history)

# Get current period usage
current = await client.usage.get_current()
print("Current usage:", current)

# Usage breakdown by model
by_model = await client.usage.by_model(
    start_date="2024-01-01",
    end_date="2024-01-31",
)
print("By model:", by_model)

# Cost breakdown
costs = await client.usage.get_costs(
    start_date="2024-01-01",
    end_date="2024-01-31",
)
print("Costs:", costs)`,
    go:   null,
    java: null,
  },

  credits: {
    typescript: `// Check credit balance
const balance = await client.credits.balance();
console.log(balance.amount);    // "42.75"
console.log(balance.currency);  // "USD"

// Transaction history
const { data: txns } = await client.credits.transactions({ limit: 20 });
txns.forEach(t => console.log(t.type, t.amount, t.createdAt));`,
    python: `# Check credit balance
balance = await client.credits.balance()
print(balance.amount)    # "42.75"
print(balance.currency)  # "USD"

# Transaction history
history = await client.credits.history(limit=50, offset=0)
for t in history.data:
    print(t.type, t.amount, t.created_at)

# Payment methods
payment_methods = await client.credits.get_payment_methods()
print("Payment methods:", payment_methods)`,
    go:   null,
    java: null,
  },

  errors: {
    typescript: `import { ColabOne, APIError, ColabOneError } from "@colab-one/sdk";

const client = new ColabOne({ apiKey: process.env.COLABONE_API_KEY });

try {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  });
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.status);   // 429
    console.log(error.message);  // "Rate limit exceeded"
    console.log(error.code);     // "rate_limit_error"
  } else if (error instanceof ColabOneError) {
    console.log("SDK error:", error.message);
  }
}

// For multi-model — errors are per-result, not thrown
const result = await client.chat.completions.create({
  model: ["gpt-4o", "claude-3-5-sonnet"],
  messages: [{ role: "user", content: "Hello!" }],
});
result.results.forEach(r => {
  if (r.status === "failed") {
    console.log(r.error?.code);    // "model_failed" | "model_timeout"
    console.log(r.error?.message); // human-readable reason
  }
});`,
    python: `from colab_one_sdk import (
    ColabOne,
    ApiError,
    AuthenticationError,
    RateLimitError,
    InsufficientCreditsError,
    ProviderError,
    ValidationError,
)
import os

client = ColabOne(api_key=os.environ.get("COLABONE_API_KEY", "mb_key"))

try:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello!"}],
    )
except AuthenticationError as e:
    print("Auth failed:", e)
except ValidationError as e:
    print("Validation errors:", e.validation_errors)
except RateLimitError as e:
    print("Rate limited. Retry after:", e.retry_after, "seconds")
except InsufficientCreditsError as e:
    print("Insufficient credits", {"required": e.required, "available": e.available})
except ProviderError as e:
    print("Provider error:", e.provider, "| retryable:", e.retryable)
except ApiError as e:
    print("API error:", e.status, e.code, e.details)

# For multi-model — errors are per-result, not raised
result = await client.chat.completions.create(
    model=["gpt-4o", "claude-3-5-sonnet"],
    messages=[{"role": "user", "content": "Hello!"}],
)
for r in result.results:
    if r.status == "failed":
        print(r.error.code)    # "model_failed" | "model_timeout"
        print(r.error.message) # human-readable reason`,
    go:   null,
    java: null,
  },

  advanced: {
    typescript: `// Per-request timeout + retry override
const res = await client.chat.completions.create(
  { model: "gpt-4o", messages: [{ role: "user", content: "Hi!" }] },
  { timeout: 10_000, maxRetries: 0 }
);

// Cancel with AbortController
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);
const res2 = await client.chat.completions.create(
  { model: "gpt-4o", messages: [{ role: "user", content: "Hi!" }] },
  { signal: controller.signal }
);`,
    python: `import asyncio
import os
from colab_one_sdk import ColabOne

client = ColabOne(
    api_key=os.environ.get("COLABONE_API_KEY", "mb_key"),
    timeout=60.0,
    max_retries=3,
)

async def main():
    # Per-request timeout override via asyncio.wait_for
    # (equivalent to AbortController timeout in TypeScript)
    async def make_request():
        return await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Write a long story"}],
            max_tokens=1000,
        )

    try:
        res = await asyncio.wait_for(make_request(), timeout=10.0)
        print("Response:", res)
    except asyncio.TimeoutError:
        print("Request cancelled — timed out after 10 seconds")

    # Batch processing with asyncio.gather (equivalent of Promise.all)
    questions = ["What is Python?", "How does async/await work?"]
    responses = await asyncio.gather(*[
        client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": q}],
            max_tokens=100,
        )
        for q in questions
    ])
    for q, r in zip(questions, responses):
        print(f"Q: {q}\nA: {r}")

    await client.close()

asyncio.run(main())`,
    go:   null,
    java: null,
  },

  sdks: {
    typescript: `import type {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionChunk,
  MultiModelChatCompletionResponse,
  MultiModelChatCompletionResult,
  Model,
  UsageRecord,
  CreditBalance,
  ColabOneClientOptions,
} from "@colab-one/sdk";

// Single-model response
const completion: ChatCompletion = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

// Multi-model response — different return type
const multi: MultiModelChatCompletionResponse = await client.chat.completions.create({
  model: ["gpt-4o", "claude-3-5-sonnet"],
  messages: [{ role: "user", content: "Hello!" }],
});`,
    python: `# colab_one_sdk is fully typed with dataclasses + type stubs
from colab_one_sdk import (
    ColabOne,
    ApiError,
    AuthenticationError,
    RateLimitError,
    InsufficientCreditsError,
    ProviderError,
    ValidationError,
)
from colab_one_sdk.types import (
    ChatCompletion,
    MultiModelChatCompletionResponse,
    MultiModelChatCompletionResult,
    Model,
)

client = ColabOne(
    api_key=os.environ.get("COLABONE_API_KEY", "mb_key"),
    timeout=30.0,
    max_retries=3,
)

# Single-model response (typed)
completion: ChatCompletion = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)

# Multi-model response (typed)
multi: MultiModelChatCompletionResponse = await client.chat.completions.create(
    model=["gpt-4o", "claude-3-5-sonnet"],
    messages=[{"role": "user", "content": "Hello!"}],
)

# Always close the client when done
await client.close()`,
    go:   null,
    java: null,
  },
};

const CODE_REST_SINGLE = `# Single-model request via REST (language-agnostic)
curl https://api.colabone.io/v1/chat/completions \\
  -H "Authorization: Bearer mb_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'`;

const CODE_REST_MULTI = `# Multi-model request — runs all models in parallel
curl https://api.colabone.io/v1/chat/completions \\
  -H "Authorization: Bearer mb_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": ["gpt-4o", "claude-3-5-sonnet", "gemini-2-flash"],
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user",   "content": "Explain quantum computing." }
    ],
    "temperature": 0.7
  }'

# Response shape for multi-model:
# {
#   "id": "mmreq_...",
#   "object": "chat.completion.group",
#   "results": [
#     { "model": "gpt-4o",            "status": "success", "content": "...", "latencyMs": 850 },
#     { "model": "claude-3-5-sonnet", "status": "success", "content": "...", "latencyMs": 920 },
#     { "model": "gemini-2-flash",    "status": "failed",  "error": { "code": "model_failed" } }
#   ],
#   "summary": { "totalModels": 3, "successfulModels": 2, "failedModels": 1 }
# }`;

// ── Static data ───────────────────────────────────────────────────────────────
const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Package,       title: "Multi-Language SDKs",    desc: "TypeScript & Python SDKs today. Go and Java coming soon." },
  { Icon: Globe,         title: "REST API",               desc: "Language-agnostic HTTP API — use from any stack." },
  { Icon: Zap,           title: "Streaming Support",      desc: "First-class async iterator / generator for real-time tokens." },
  { Icon: Layers,        title: "Multi-Model Routing",    desc: "Send one prompt to N models in parallel. Compare results." },
  { Icon: Shield,        title: "Type-Safe",              desc: "Full type coverage in TypeScript & Python type stubs." },
  { Icon: RefreshCw,     title: "Automatic Retries",      desc: "Exponential backoff for transient errors and 429s." },
  { Icon: AlertTriangle, title: "Typed Error Handling",   desc: "Structured error classes with status and error codes." },
  { Icon: Box,           title: "ESM & CommonJS",         desc: "TypeScript: dual package. Python: wheels + sdist." },
];

const PLATFORM_FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Cpu,          title: "150+ Models",        desc: "OpenAI, Anthropic, Gemini, Groq, Mistral and more — all under one API key." },
  { Icon: GitBranch,    title: "Parallel Routing",   desc: "Fan out any request to multiple models simultaneously and compare responses." },
  { Icon: Boxes,        title: "Unified Billing",    desc: "One wallet, one invoice. Aggregated across every provider you use." },
  { Icon: MessageSquare,title: "Streaming",          desc: "Real-time token streaming with SSE for single-model requests." },
  { Icon: Bot,          title: "Agent-Ready",        desc: "Build chatbots and agents that automatically fall back across models." },
  { Icon: Workflow,     title: "Analytics & Usage",  desc: "Per-model token tracking, cost breakdown, and usage history." },
];

const CONFIG_PARAMS = [
  { param: "apiKey / api_key",   type: "string",                 default: "—",                          desc: "Your ColabOne API key (required)" },
  { param: "baseURL / base_url", type: "string",                 default: "https://api.colabone.io", desc: "Override the API base URL" },
  { param: "timeout",            type: "number / int",           default: "60 000ms / 60s",             desc: "Request timeout" },
  { param: "maxRetries",         type: "number / int",           default: "2",                          desc: "Max retry attempts on transient errors" },
  { param: "defaultHeaders",     type: "Record<string, string>", default: "{}",                         desc: "Headers sent with every request" },
];

const ENVIRONMENTS = [
  { name: "Node.js 18+",        note: "TypeScript / JS" },
  { name: "Python 3.9+",        note: "pip install"     },
  { name: "Cloudflare Workers", note: "Edge native"     },
  { name: "Vercel Edge",        note: "Edge native"     },
  { name: "Bun",                note: "Full support"    },
  { name: "Deno",               note: "npm: prefix"     },
];

const ERROR_TYPES = [
  // TypeScript
  "APIError", "ColabOneError", "AuthenticationError", "RateLimitError", "NotFoundError",
  // Python
  "ApiError", "ValidationError", "InsufficientCreditsError", "ProviderError", "TimeoutError",
];

const MULTI_MODEL_STATUSES = [
  { status: "success", color: "bg-green-50 text-green-700 border-green-200", desc: "Model responded successfully within timeout." },
  { status: "failed",  color: "bg-red-50 text-red-700 border-red-200",       desc: "Model returned an error (provider error, invalid request, etc.)." },
  { status: "timeout", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Model did not respond within MULTI_MODEL_TIMEOUT_MS (default 60s)." },
];

// ── Coding-agent integrations ───────────────────────────────────────────────────
const INTEGRATIONS_BASE_URL = "https://model-bridge-cms-backend.onrender.com/api/v1";

type IntegrationCategory = "VS Code Extension" | "IDE" | "CLI";

type IntegrationEntry = {
  id: string;
  name: string;
  category: IntegrationCategory;
  blurb: string;
  steps: string[];
  blocks: { lang: string; code: string }[];
  note?: { type: "tip" | "info" | "warn"; text: string };
};

const INTEGRATIONS: IntegrationEntry[] = [
  {
    id: "integration-cline",
    name: "Cline",
    category: "VS Code Extension",
    blurb: "Cline talks to any OpenAI-compatible endpoint, so pointing it at Colab-One is a single settings change.",
    steps: [
      "Open the Cline panel in VS Code and click the gear icon to open Settings.",
      "Under API Provider, choose OpenAI Compatible.",
      "Paste the Base URL and your Colab-One API key below, then set a Model ID.",
      "Save — every Cline request now routes through Colab-One.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel ID:  gpt-4o` },
    ],
  },
  {
    id: "integration-roo-code",
    name: "Roo Code",
    category: "VS Code Extension",
    blurb: "Roo Code is a Cline fork and shares the same OpenAI Compatible provider settings.",
    steps: [
      "Open the Roo Code panel in VS Code and click the gear icon to open Settings.",
      "Under API Provider, choose OpenAI Compatible.",
      "Paste the Base URL and your Colab-One API key below, then set a Model ID.",
      "Save — Roo Code now routes through Colab-One.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel ID:  gpt-4o` },
    ],
  },
  {
    id: "integration-kilo-code",
    name: "Kilo Code",
    category: "VS Code Extension",
    blurb: "Kilo Code shares the same Cline-derived settings UI — the OpenAI Compatible provider works the same way.",
    steps: [
      "Open the Kilo Code panel in VS Code and click the gear icon to open Settings.",
      "Under API Provider, choose OpenAI Compatible.",
      "Paste the Base URL and your Colab-One API key below, then set a Model ID.",
      "Save — Kilo Code now routes through Colab-One.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel ID:  gpt-4o` },
    ],
  },
  {
    id: "integration-cursor",
    name: "Cursor",
    category: "IDE",
    blurb: "Cursor lets you override its OpenAI endpoint directly from the Models settings tab.",
    steps: [
      "Open Cursor Settings (Ctrl/Cmd + Shift + J) and go to the Models tab.",
      "Enable Override OpenAI Base URL and paste the Base URL below.",
      "Paste your Colab-One API key into the OpenAI API Key field and click Verify.",
      "Add the model names you want to use (e.g. gpt-4o) under Model Names.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel:     gpt-4o` },
    ],
  },
  {
    id: "integration-copilot",
    name: "GitHub Copilot",
    category: "VS Code Extension",
    blurb: "Recent Copilot Chat builds support bring-your-own-key OpenAI-compatible providers via Manage Models.",
    steps: [
      "Open the Command Palette and run GitHub Copilot: Manage Models.",
      "Choose OpenAI Compatible as the provider.",
      "Enter the Base URL, your Colab-One API key, and the model id(s) to register.",
      "Select the new Colab-One model from the Copilot Chat model picker.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel ID:  gpt-4o` },
    ],
    note: { type: "info", text: "BYOK provider support is rolling out gradually across Copilot builds. If Manage Models isn't available, update the extension to the latest version." },
  },
  {
    id: "integration-codex",
    name: "Codex CLI",
    category: "CLI",
    blurb: "The OpenAI Codex CLI supports custom model providers through its TOML config file and named profiles.",
    steps: [
      "Open ~/.codex/config.toml and add a colab-one provider and profile (below).",
      "Export your Colab-One key as the environment variable referenced by env_key.",
      "Run Codex with --profile colab-one, or set it as your default profile.",
    ],
    blocks: [
      { lang: "toml", code: `[model_providers.colab-one]\nname = "Colab-One"\nbase_url = "${INTEGRATIONS_BASE_URL}"\nenv_key = "COLAB_ONE_API_KEY"\n\n[profiles.colab-one]\nmodel_provider = "colab-one"\nmodel = "gpt-4o"` },
      { lang: "bash", code: `export COLAB_ONE_API_KEY=mb_your_api_key\ncodex --profile colab-one` },
    ],
  },
  {
    id: "integration-gemini-cli",
    name: "Gemini CLI",
    category: "CLI",
    blurb: "Gemini CLI can authenticate against any OpenAI-compatible endpoint instead of Google's default backend.",
    steps: [
      "Export the OpenAI-compatible environment variables below before launching Gemini CLI.",
      "Choose the openai auth type when prompted (or set it in ~/.gemini/settings.json).",
      "Run gemini — requests now flow through Colab-One.",
    ],
    blocks: [
      { lang: "bash", code: `export OPENAI_API_KEY=mb_your_api_key\nexport OPENAI_BASE_URL=${INTEGRATIONS_BASE_URL}\nexport OPENAI_MODEL=gpt-4o` },
    ],
    note: { type: "info", text: "Flag and setting names have shifted between Gemini CLI releases — run gemini --help if this doesn't match your installed version." },
  },
  {
    id: "integration-continue",
    name: "Continue",
    category: "VS Code Extension",
    blurb: "Continue is config-file driven — add Colab-One as an openai provider block in config.yaml.",
    steps: [
      "Run Continue: Open Config from the Command Palette to open config.yaml.",
      "Add a models entry with provider: openai and your Colab-One details (below).",
      "Reload the window — Colab-One appears in Continue's model picker.",
    ],
    blocks: [
      { lang: "yaml", code: `models:\n  - name: Colab-One\n    provider: openai\n    model: gpt-4o\n    apiKey: mb_your_api_key\n    apiBase: ${INTEGRATIONS_BASE_URL}` },
    ],
  },
  {
    id: "integration-opencode",
    name: "OpenCode",
    category: "CLI",
    blurb: "OpenCode reads provider definitions from opencode.json, using the same AI SDK OpenAI-compatible adapter.",
    steps: [
      "Create or edit opencode.json in your project root (or ~/.config/opencode/).",
      "Register Colab-One as an OpenAI-compatible provider (below).",
      "Export your Colab-One key and run opencode.",
    ],
    blocks: [
      { lang: "json", code: `{\n  "provider": {\n    "colab-one": {\n      "npm": "@ai-sdk/openai-compatible",\n      "options": {\n        "baseURL": "${INTEGRATIONS_BASE_URL}",\n        "apiKey": "{env:COLAB_ONE_API_KEY}"\n      },\n      "models": { "gpt-4o": {} }\n    }\n  }\n}` },
      { lang: "bash", code: `export COLAB_ONE_API_KEY=mb_your_api_key\nopencode` },
    ],
  },
  {
    id: "integration-droid",
    name: "Droid",
    category: "CLI",
    blurb: "Factory's Droid CLI supports custom OpenAI-compatible models through its in-app model manager.",
    steps: [
      "Run droid, then use /model → Add custom model (or edit ~/.factory/config.json directly).",
      "Set the provider to OpenAI Compatible and fill in the fields below.",
      "Save and select the new model — Droid now calls Colab-One.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel:     gpt-4o` },
    ],
  },
  {
    id: "integration-antigravity",
    name: "Antigravity",
    category: "IDE",
    blurb: "Antigravity supports custom OpenAI-compatible model providers from its Models settings panel.",
    steps: [
      "Open Settings → Models → Add Provider.",
      "Choose OpenAI Compatible.",
      "Paste in the Base URL and API key below, then add the models you want available.",
    ],
    blocks: [
      { lang: "config", code: `Base URL:  ${INTEGRATIONS_BASE_URL}\nAPI Key:   mb_your_api_key\nModel:     gpt-4o` },
    ],
    note: { type: "info", text: "Antigravity is a newer, fast-moving tool — search its docs for \"custom model provider\" if these settings labels have moved." },
  },
  {
    id: "integration-claude-code",
    name: "Claude Code",
    category: "CLI",
    blurb: "Claude Code speaks Anthropic's native Messages API rather than the OpenAI format used by the tools above.",
    steps: [
      "Skip the Base URL / API Key fields above — Claude Code uses two environment variables instead.",
      "Export ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN as shown below.",
      "Run claude as usual — its requests are sent to your ANTHROPIC_BASE_URL.",
    ],
    blocks: [
      { lang: "bash", code: `export ANTHROPIC_BASE_URL=${INTEGRATIONS_BASE_URL.replace(/\/api\/v1$/, "")}\nexport ANTHROPIC_AUTH_TOKEN=mb_your_api_key` },
    ],
    note: { type: "warn", text: "This requires Colab-One's Anthropic-compatible Messages endpoint on your deployment. If only /api/v1/chat/completions is exposed, use one of the OpenAI-compatible tools above instead." },
  },
];

const INTEGRATION_CATEGORY_ICON: Record<IntegrationCategory, LucideIcon> = {
  "VS Code Extension": Puzzle,
  "IDE": MousePointer2,
  "CLI": Terminal,
};

// ── Syntax highlighter ────────────────────────────────────────────────────────
function highlightLine(line: string): React.ReactNode {
  if (/^\s*\/\//.test(line)) return <span style={{ color: SYN.comment }}>{line}</span>;
  if (/^\s*#/.test(line))    return <span style={{ color: SYN.comment }}>{line}</span>;

  const regex =
    /("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')|(\/\/.*)|(\b(?:import|export|from|const|let|var|async|await|return|new|if|else|try|catch|throw|for|of|true|false|null|undefined|process|def|print|class|self|import|from|as|None|True|False|in|not|and|or|with|raise|except|pass|lambda)\b)|(\b[A-Z][a-zA-Z0-9]*\b)|(\b\d[\d_]*(?:\.\d+)?\b)/g;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last)
      parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last, m.index)}</span>);
    const [full, str, cmt, kw, typ, num] = m;
    const color = str ? SYN.string : cmt ? SYN.comment : kw ? SYN.keyword : typ ? SYN.type : num ? SYN.number : SYN.plain;
    parts.push(<span key={m.index} style={{ color }}>{full}</span>);
    last = m.index + full.length;
  }
  if (last < line.length)
    parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last)}</span>);

  return parts.length ? <>{parts}</> : <span style={{ color: SYN.plain }}>{line}</span>;
}

function highlight(code: string) {
  return code.split("\n").map((line, i) => (
    <span key={i} style={{ display: "block" }}>{highlightLine(line)}</span>
  ));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyBtn({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }, [code]);

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
        done
          ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-400"
          : "border-white/10 bg-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {done ? <Check size={10} /> : <Copy size={10} />}
      {done ? "Copied!" : "Copy"}
    </button>
  );
}

/** Plain (non-tabbed) code block */
function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F172A] border-b border-white/5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">{lang}</span>
        <CopyBtn code={code} />
      </div>
      <pre className="m-0 p-5 bg-[#0F172A] text-[13px] leading-[1.75] overflow-x-auto font-mono">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

/** Language-tabbed code block (TypeScript / Python / Go-soon / Java-soon) */
function LangCodeBlock({
  codes,
  activeLang,
}: {
  codes: Record<LangTab, string | null>;
  activeLang: LangTab;
}) {
  const langMeta = LANG_TABS.find(l => l.id === activeLang)!;
  const code = codes[activeLang];

  if (!code) {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F172A] border-b border-white/5">
          <span className={`text-[10px] font-semibold uppercase tracking-widest font-mono ${langMeta.color}`}>
            {langMeta.label}
          </span>
        </div>
        <div className="p-8 bg-[#0F172A] flex flex-col items-center justify-center gap-3">
          <Clock size={22} className="text-slate-600" />
          <p className="text-slate-500 text-[13px] font-medium">
            {langMeta.label} SDK — coming soon
          </p>
          <p className="text-slate-600 text-[12px]">
            Use the <a href="#sdk-rest" className="text-indigo-400 hover:underline">REST API</a> in the meantime — it works from any language.
          </p>
        </div>
      </div>
    );
  }

  const langLabel = activeLang === "typescript" ? "typescript" : activeLang === "python" ? "python" : activeLang;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F172A] border-b border-white/5">
        <span className={`text-[10px] font-semibold uppercase tracking-widest font-mono ${langMeta.color}`}>
          {langMeta.label}
        </span>
        <CopyBtn code={code} />
      </div>
      <pre className="m-0 p-5 bg-[#0F172A] text-[13px] leading-[1.75] overflow-x-auto font-mono">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

/** The persistent language tab bar — shown at the top of every SDK-related section */
function LangTabs({
  activeLang,
  onChange,
}: {
  activeLang: LangTab;
  onChange: (l: LangTab) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 border border-slate-200 rounded-xl p-1 bg-slate-50 mb-4 w-fit">
      {LANG_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.badge && onChange(tab.id)}
          disabled={!!tab.badge}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
            tab.badge
              ? "text-slate-400 cursor-not-allowed"
              : activeLang === tab.id
              ? "bg-[#0F172A] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 cursor-pointer"
          }`}
        >
          <span className={activeLang === tab.id && !tab.badge ? "text-white" : tab.color}>
            {tab.label}
          </span>
          {tab.badge && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-400 rounded-full px-1.5 py-0.5">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[0.855em] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
      {children}
    </code>
  );
}

function Callout({ type = "tip", children }: { type?: "tip" | "info" | "warn"; children: React.ReactNode }) {
  const cfg = {
    tip:  { cls: "bg-indigo-50 border-l-indigo-500", icon: "✦", textCls: "text-indigo-900" },
    info: { cls: "bg-blue-50 border-l-blue-500",     icon: "ℹ", textCls: "text-blue-900"   },
    warn: { cls: "bg-amber-50 border-l-amber-500",   icon: "⚠", textCls: "text-amber-900"  },
  }[type];
  return (
    <div className={`border-l-4 rounded-r-lg p-4 flex gap-3 mb-6 ${cfg.cls}`}>
      <span className="flex-shrink-0 mt-0.5 text-sm">{cfg.icon}</span>
      <div className={`text-sm leading-relaxed ${cfg.textCls}`}>{children}</div>
    </div>
  );
}

function SecHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-[86px] mb-7 group">
      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">{eyebrow}</p>
      <h2 className="text-2xl font-black text-[#0F172A] tracking-tight leading-tight flex items-baseline gap-2">
        {title}
        <a href={`#${id}`} className="text-base text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity no-underline" aria-hidden>#</a>
      </h2>
    </div>
  );
}

function SectionNext({ currentId }: { currentId: string }) {
  const idx = FLAT_SECTIONS.findIndex(s => s.id === currentId);
  const next = FLAT_SECTIONS[idx + 1];
  if (!next) return null;
  return (
    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
      <a href={`#${next.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
        Next: {next.label} →
      </a>
    </div>
  );
}

/** Renders one coding-agent integration guide: blurb, numbered steps, config block(s), optional note */
function IntegrationBlock({ integration }: { integration: IntegrationEntry }) {
  const CategoryIcon = INTEGRATION_CATEGORY_ICON[integration.category];
  return (
    <section className="mb-14">
      <div id={integration.id} className="scroll-mt-[86px] mb-7 group">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Integrations</p>
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight leading-tight flex items-baseline gap-2">
            {integration.name}
            <a href={`#${integration.id}`} className="text-base text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity no-underline" aria-hidden>#</a>
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border border-slate-200 bg-slate-50 rounded-full px-2.5 py-0.5">
            <CategoryIcon size={11} />
            {integration.category}
          </span>
        </div>
      </div>

      <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">{integration.blurb}</p>

      <div className="flex flex-col gap-2 mb-6">
        {integration.steps.map((step, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-[13.5px] text-slate-600 leading-relaxed pt-0.5">{step}</p>
          </div>
        ))}
      </div>

      {integration.blocks.map((block, i) => (
        <CodeBlock key={i} code={block.code} lang={block.lang} />
      ))}

      {integration.note && <Callout type={integration.note.type}>{integration.note.text}</Callout>}

      <SectionNext currentId={integration.id} />
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [active, setActive]           = useState("introduction");
  const [pkgTab, setPkgTab]           = useState<"npm" | "pnpm" | "yarn" | "bun">("npm");
  const [activeLang, setActiveLang]   = useState<LangTab>("typescript");
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return FLAT_SECTIONS.filter(s => s.label.toLowerCase().includes(q));
  }, [searchQuery]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-15% 0% -65% 0%" }
    );
    FLAT_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen  bg-[#F8FAFC]">
      <Navbar />

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 z-[100] flex items-start justify-center pt-[15vh] backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-[540px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documentation…"
                className="flex-1 border-none bg-transparent text-[15px] text-[#0F172A] outline-none placeholder:text-slate-400 font-medium"
              />
              <button
                aria-label="Close search"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            {searchQuery.trim() === "" ? (
              <div className="px-5 py-4 text-sm text-slate-400">Type to search across all documentation.</div>
            ) : searchResults.length === 0 ? (
              <div className="px-5 py-4 text-sm text-slate-400">No results for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <div className="py-2">
                {searchResults.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50 text-[14px] text-[#0F172A] font-medium transition-colors"
                  >
                    <Search size={13} className="text-indigo-400 flex-shrink-0" />
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Three-column layout */}
      <div className="pt-[86px]">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_218px]">

          {/* ── Left sidebar ── */}
          <aside
            className="hidden md:flex flex-col sticky bg-white border-r border-slate-100 overflow-y-auto"
            style={{ top: "86px", height: "calc(100vh - 86px)" }}
          >
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-2.5 px-1 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/20 flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 2L12.5 5V10L7.5 13L2.5 10V5L7.5 2Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M7.5 4.5L10 6V9L7.5 10.5L5 9V6L7.5 4.5Z" fill="white" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-black text-[#0F172A] tracking-tight leading-none">ColabOne</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Docs</p>
                </div>
                <span className="ml-auto text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-full px-2 py-0.5 tracking-wide">
                  v1.0.0
                </span>
              </div>

              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-slate-400 text-[13px] font-medium cursor-pointer"
              >
                <Search size={12} />
                <span className="flex-1 text-left">Search docs…</span>
                <span className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</span>
              </button>

              <nav className="flex flex-col gap-1">
                {SECTIONS.map(grp => (
                  <div key={grp.group} className="mb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] px-3 mb-1.5">{grp.group}</p>
                    {grp.items.map(it => {
                      const isActive = active === it.id;
                      return (
                        <a
                          key={it.id}
                          href={`#${it.id}`}
                          className={`block px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border-l-2 ${
                            isActive
                              ? "text-indigo-600 bg-indigo-50 border-indigo-500 font-semibold"
                              : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border-transparent"
                          }`}
                        >
                          {it.label}
                        </a>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="min-w-0 px-6 py-8 md:px-12 md:py-12 ">

            {/* Introduction */}
            <div id="introduction" className="scroll-mt-[86px] mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.18em]">Documentation · v1.0.0</span>
              </div>
              <h1 className="text-5xl font-black text-[#0F172A] tracking-tight leading-[1.05] mb-5">
                ColabOne <span className="text-indigo-600">Docs</span>
              </h1>
              <p className="text-[17px] text-slate-600 leading-[1.72] mb-4 max-w-[580px]">
                Access 150+ AI models through a single, unified API — with multi-model parallel routing, streaming, retries, and full type-safety built in.
              </p>

              {/* SDK language pills */}
              <div className="flex items-center gap-2 flex-wrap mb-8">
                <span className="text-[12px] text-slate-400 font-medium">SDKs available in:</span>
                {[
                  { lang: "TypeScript", color: "bg-sky-50 text-sky-700 border-sky-200" },
                  { lang: "Python",     color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                  { lang: "Go",         color: "bg-cyan-50 text-cyan-600 border-cyan-200", soon: true },
                  { lang: "Java",       color: "bg-orange-50 text-orange-700 border-orange-200", soon: true },
                ].map(s => (
                  <span key={s.lang} className={`inline-flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-2.5 py-0.5 ${s.color}`}>
                    {s.lang}
                    {s.soon && <span className="text-[9px] opacity-60">coming soon</span>}
                  </span>
                ))}
              </div>

              <div className="flex gap-3 mb-8 flex-wrap">
                <a href="#quickstart" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5">
                  Get Started →
                </a>
                <a href="#multimodel" className="inline-flex items-center gap-2 px-5 py-2.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-2xl transition-all hover:-translate-y-0.5">
                  Multi-Model Docs →
                </a>
                <a href="https://github.com" className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white hover:border-indigo-200 text-slate-700 text-sm font-bold rounded-2xl transition-all hover:-translate-y-0.5">
                  <ExternalLink size={13} />View on GitHub
                </a>
              </div>

              {/* Install bars */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-[#0F172A] rounded-2xl mb-2">
                <code className="font-mono text-[13px]" style={{ color: SYN.plain }}>
                  <span style={{ color: SYN.comment }}>$</span>{" "}
                  <span style={{ color: SYN.keyword }}>npm</span>{" "}
                  <span style={{ color: SYN.string }}>install @colab-one/sdk</span>
                </code>
                <CopyBtn code="npm install @colab-one/sdk" />
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 bg-[#0F172A] rounded-2xl mb-4">
                <code className="font-mono text-[13px]" style={{ color: SYN.plain }}>
                  <span style={{ color: SYN.comment }}>$</span>{" "}
                  <span style={{ color: SYN.keyword }}>pip</span>{" "}
                  <span style={{ color: SYN.string }}>install colab-one-sdk</span>
                </code>
                <CopyBtn code="pip install colab-one-sdk" />
              </div>

              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-[13px] font-bold text-indigo-800 mb-1">💡 Unified model selection</p>
                <p className="text-[13px] text-indigo-700 leading-relaxed">
                  ColabOne uses the unified <InlineCode>model</InlineCode> field, which accepts either a single model string or an array of model strings for parallel routing. See the <a href="#sdk-model-field" className="underline font-semibold">model field docs →</a>
                </p>
              </div>

              <SectionNext currentId="introduction" />
            </div>

            {/* Installation */}
            <section className="mb-14">
              <SecHead id="installation" eyebrow="Getting Started" title="Installation" />

              <p className="text-[14px] font-semibold text-[#0F172A] mb-3">TypeScript / JavaScript</p>
              <div className="flex gap-0.5 border-b border-slate-200 mb-3">
                {(["npm", "pnpm", "yarn", "bun"] as const).map(pkg => (
                  <button
                    key={pkg}
                    onClick={() => setPkgTab(pkg)}
                    className={`px-4 py-2 text-[13px] font-mono font-medium border-b-2 -mb-px transition-all cursor-pointer ${
                      pkgTab === pkg ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
              <CodeBlock code={INSTALL_PKG[pkgTab]} lang="bash" />

              <p className="text-[14px] font-semibold text-[#0F172A] mb-3">Python</p>
              <CodeBlock code={INSTALL_PYTHON} lang="bash" />

              <p className="text-[14px] text-slate-600 leading-relaxed">
                TypeScript requires <InlineCode>Node.js 18+</InlineCode>, Bun, Deno, or a modern browser. Python requires <InlineCode>Python 3.9+</InlineCode>. No additional runtime dependencies for either.
              </p>
              <SectionNext currentId="installation" />
            </section>

            {/* Quick Start */}
            <section className="mb-14">
              <SecHead id="quickstart" eyebrow="Getting Started" title="Quick Start" />
              <Callout type="tip">
                Get your API key from the <a href="/dashboard/keys" className="text-indigo-600 font-semibold hover:underline">ColabOne Dashboard</a>. Set it as <InlineCode>COLABONE_API_KEY</InlineCode> in your environment.
              </Callout>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.quickstart} activeLang={activeLang} />
              <SectionNext currentId="quickstart" />
            </section>

            {/* Features */}
            <section className="mb-14">
              <SecHead id="features" eyebrow="Overview" title="SDK Features" />
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map(f => (
                  <div key={f.title} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 cursor-default group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2.5">
                      <f.Icon size={15} className="text-indigo-600" />
                    </div>
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-1.5 group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
              <SectionNext currentId="features" />
            </section>

            {/* Configuration */}
            <section className="mb-14">
              <SecHead id="configuration" eyebrow="Core Concepts" title="Configuration" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Pass options to the client constructor. Only <InlineCode>apiKey</InlineCode> (TypeScript) / <InlineCode>api_key</InlineCode> (Python) is required.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.config} activeLang={activeLang} />
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-5">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Parameter", "Type", "Default", "Description"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CONFIG_PARAMS.map((row, i) => (
                      <tr key={row.param} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className={`px-4 py-3 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}><InlineCode>{row.param}</InlineCode></td>
                        <td className={`px-4 py-3 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}><InlineCode>{row.type}</InlineCode></td>
                        <td className={`px-4 py-3 font-mono text-[12px] text-slate-400 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}>{row.default}</td>
                        <td className={`px-4 py-3 text-slate-600 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SectionNext currentId="configuration" />
            </section>

            {/* Architecture */}
            <section className="mb-14">
              <SecHead id="architecture" eyebrow="Core Concepts" title="Architecture" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                All SDK resources share a single configured client. Requests flow through the ColabOne gateway which handles routing, billing, and logging.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl p-8 mb-5">
                <div className="flex items-center justify-center flex-wrap gap-y-3">
                  {["SDK Client", "ColabOne Gateway", "Provider Router", "AI Providers"].map((node, i, arr) => (
                    <div key={node} className="flex items-center">
                      <div className={`border rounded-lg px-4 py-2 text-[13px] font-semibold font-mono whitespace-nowrap ${
                        i === 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700" : i === arr.length - 1 ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"
                      }`}>{node}</div>
                      {i < arr.length - 1 && <span className="px-2 text-indigo-400 font-bold">→</span>}
                    </div>
                  ))}
                </div>
                <p className="text-center text-[12px] text-slate-400 font-medium mt-4">
                  Single API call → ColabOne routes to any of 150+ models across multiple providers, returning a unified response with usage and billing.
                </p>
              </div>
              <SectionNext currentId="architecture" />
            </section>

            {/* Environments */}
            <section className="mb-14">
              <SecHead id="environments" eyebrow="Core Concepts" title="Environment Support" />
              <div className="grid grid-cols-3 gap-3">
                {ENVIRONMENTS.map(env => (
                  <div key={env.name} className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-indigo-200 transition-colors">
                    <p className="text-[13px] font-bold text-[#0F172A] mb-0.5">{env.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{env.note}</p>
                  </div>
                ))}
              </div>
              <SectionNext currentId="environments" />
            </section>

            {/* === SDK REFERENCE === */}

            {/* model field */}
            <section className="mb-14">
              <SecHead id="sdk-model-field" eyebrow="SDK Reference" title="The model Field" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Both SDKs use the unified <InlineCode>model</InlineCode> field. It accepts either a single model name as a string, or an array of model names as strings. Passing an array of models enables parallel routing and executes all requested models simultaneously.
              </p>
              <Callout type="tip">
                The <InlineCode>model</InlineCode> field is fully compatible with OpenAI-style single model requests, while offering the flexibility to pass an array of models for multi-model parallel routing.
              </Callout>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.model_field} activeLang={activeLang} />
              <SectionNext currentId="sdk-model-field" />
            </section>

            {/* Chat Completions */}
            <section className="mb-14">
              <SecHead id="chat" eyebrow="SDK Reference" title="Chat Completions (Single Model)" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Pass a single model name string in <InlineCode>model</InlineCode> for a standard chat response. All parameters are supported: <InlineCode>temperature</InlineCode>, <InlineCode>max_tokens</InlineCode>, <InlineCode>modalities</InlineCode>, and more.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.chat} activeLang={activeLang} />
              <p className="text-[14px] text-slate-600 leading-relaxed">Direct REST API (any language):</p>
              <CodeBlock code={CODE_REST_SINGLE} lang="bash" />
              <SectionNext currentId="chat" />
            </section>

            {/* Multi-Model Requests */}
            <section className="mb-14">
              <SecHead id="multimodel" eyebrow="SDK Reference" title="Multi-Model Requests" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-3">
                Pass two or more model names in a string array to the <InlineCode>model</InlineCode> field. ColabOne executes all models <strong>in parallel</strong> and returns a grouped response with per-model results, latency, usage, and billing.
              </p>
              <Callout type="info">
                Multi-model requests do <strong>not</strong> support streaming. Use <InlineCode>stream: false</InlineCode> (the default) for multi-model calls.
              </Callout>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.multimodel} activeLang={activeLang} />

              <p className="text-[14px] font-semibold text-[#0F172A] mb-3 mt-2">Result status codes</p>
              <div className="flex flex-col gap-2 mb-6">
                {MULTI_MODEL_STATUSES.map(s => (
                  <div key={s.status} className={`flex items-start gap-3 border rounded-xl p-3 ${s.color}`}>
                    <span className={`font-mono text-[12px] font-bold border rounded px-2 py-0.5 mt-0.5 ${s.color}`}>{s.status}</span>
                    <p className="text-[13px] leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-[14px] text-slate-600 leading-relaxed mb-3">Direct REST API — same endpoint, any number of models:</p>
              <CodeBlock code={CODE_REST_MULTI} lang="bash" />
              <SectionNext currentId="multimodel" />
            </section>

            {/* Streaming */}
            <section className="mb-14">
              <SecHead id="streaming" eyebrow="SDK Reference" title="Streaming" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Set <InlineCode>stream: true</InlineCode> (TypeScript) / <InlineCode>stream=True</InlineCode> (Python) to receive tokens in real time. Supported for <strong>single-model</strong> requests only.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.streaming} activeLang={activeLang} />
              <Callout type="info">
                TypeScript streaming uses async iterators. Python streaming uses a synchronous generator — wrap in <InlineCode>asyncio</InlineCode> for async use.
              </Callout>
              <SectionNext currentId="streaming" />
            </section>

            {/* Platform Models */}
            <section className="mb-14">
              <SecHead id="platform-models" eyebrow="SDK Reference" title="Listing Models" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Browse, filter, and retrieve metadata for all 150+ available models including real-time pricing and capabilities.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.platform_models} activeLang={activeLang} />
              <SectionNext currentId="platform-models" />
            </section>

            {/* Usage */}
            <section className="mb-14">
              <SecHead id="usage" eyebrow="SDK Reference" title="Usage Records" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Query your usage history and aggregate statistics for billing and analytics.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.usage} activeLang={activeLang} />
              <SectionNext currentId="usage" />
            </section>

            {/* Credits */}
            <section className="mb-14">
              <SecHead id="credits" eyebrow="SDK Reference" title="Credits" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Check your credit balance and list transaction history programmatically.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.credits} activeLang={activeLang} />
              <Callout type="tip">
                Start with <strong>$5 free credits</strong> on signup — no credit card required.{" "}
                <a href="/auth/register" className="text-indigo-600 font-semibold hover:underline">Create your account →</a>
              </Callout>
              <SectionNext currentId="credits" />
            </section>

            {/* === INTEGRATIONS === */}

            <section className="mb-14">
              <SecHead id="integrations-overview" eyebrow="Integrations" title="Coding Agent Integrations" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Most AI coding agents already speak the OpenAI Chat Completions format. Point their <InlineCode>base URL</InlineCode> at Colab-One and drop in your Colab-One API key as the <InlineCode>API key</InlineCode> — no other code changes required.
              </p>
              <Callout type="tip">
                Grab your key from the <a href="/dashboard/keys" className="text-indigo-600 font-semibold hover:underline">Colab-One Dashboard</a> first. Every guide below uses this Base URL: <InlineCode>{INTEGRATIONS_BASE_URL}</InlineCode>
              </Callout>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {INTEGRATIONS.map(integration => {
                  const CategoryIcon = INTEGRATION_CATEGORY_ICON[integration.category];
                  return (
                    <a
                      key={integration.id}
                      href={`#${integration.id}`}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2.5">
                        <CategoryIcon size={15} className="text-indigo-600" />
                      </div>
                      <p className="text-[13px] font-bold text-[#0F172A] mb-0.5 group-hover:text-indigo-700 transition-colors">{integration.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{integration.category}</p>
                    </a>
                  );
                })}
              </div>
              <SectionNext currentId="integrations-overview" />
            </section>

            {INTEGRATIONS.map(integration => (
              <IntegrationBlock key={integration.id} integration={integration} />
            ))}

            {/* === PLATFORM FEATURES === */}

            <section className="mb-14">
              <SecHead id="platform-overview" eyebrow="Platform Features" title="Platform Overview" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-6">
                ColabOne is more than an SDK — it is a full AI gateway platform with multi-provider routing, unified billing, and a model registry.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_FEATURES.map(f => (
                  <div key={f.title} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2.5">
                      <f.Icon size={15} className="text-indigo-600" />
                    </div>
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-1.5 group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
              <SectionNext currentId="platform-overview" />
            </section>

            <section className="mb-14">
              <SecHead id="chatbot-agents" eyebrow="Platform Features" title="Building Chatbots & Agents" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Maintain a conversation history array, append each turn, and send it with your preferred model. Passing a model array to the <InlineCode>model</InlineCode> field means you can try multiple models per turn automatically.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.agent} activeLang={activeLang} />
              <SectionNext currentId="chatbot-agents" />
            </section>

            <section className="mb-14">
              <SecHead id="multimodel-agents" eyebrow="Platform Features" title="Multi-Model Agents" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Build resilient agents that automatically try alternative models when the primary fails — no extra infrastructure needed.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <p className="text-[13px] font-black text-[#0F172A] uppercase tracking-wide mb-4">How multi-model agent routing works</p>
                <div className="flex flex-col gap-3">
                  {[
                    { step: "1", title: "Send one request", desc: "Pass multiple model names as an array in the model field along with your messages." },
                    { step: "2", title: "Parallel execution", desc: "ColabOne fans out the request to all models simultaneously. No extra code needed." },
                    { step: "3", title: "Per-model results", desc: "Each model returns its own response, status, latency, usage, and billing." },
                    { step: "4", title: "Pick the best", desc: "In your app, select the first successful result, the cheapest, or the fastest." },
                  ].map(item => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[12px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</div>
                      <div>
                        <p className="text-[14px] font-bold text-[#0F172A]">{item.title}</p>
                        <p className="text-[13px] text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Callout type="info">
                Multi-model timeout is configurable via <InlineCode>MULTI_MODEL_TIMEOUT_MS</InlineCode> (default: 60 000ms). Per-model retry count is controlled by <InlineCode>MULTI_MODEL_RETRY_COUNT</InlineCode> (default: 0).
              </Callout>
              <SectionNext currentId="multimodel-agents" />
            </section>

            <section className="mb-14">
              <SecHead id="guardrails" eyebrow="Platform Features" title="Guardrails" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                ColabOne includes a guardrails module for content safety. Guardrails run between your request and the provider, allowing you to block or flag harmful content before it is sent or returned.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                <p className="text-[13px] text-slate-500 italic">Guardrails configuration is managed via the platform dashboard. SDK-level guardrails configuration coming in a future release.</p>
              </div>
              <SectionNext currentId="guardrails" />
            </section>

            {/* Error Handling */}
            <section className="mb-14">
              <SecHead id="errors" eyebrow="Advanced" title="Error Handling" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Single-model errors are thrown/raised as structured error classes. Multi-model errors are returned per-result inside <InlineCode>results[].error</InlineCode> — never thrown.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {ERROR_TYPES.map(e => (
                  <span key={e} className="font-mono text-[12px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-3 py-1">{e}</span>
                ))}
              </div>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.errors} activeLang={activeLang} />
              <SectionNext currentId="errors" />
            </section>

            {/* Advanced Usage */}
            <section className="mb-14">
              <SecHead id="advanced" eyebrow="Advanced" title="Advanced Usage" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Override per-request options, cancel requests, and configure custom retry behaviour.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.advanced} activeLang={activeLang} />
              <SectionNext currentId="advanced" />
            </section>

            {/* SDK Reference */}
            <section className="mb-14">
              <SecHead id="sdks" eyebrow="Reference" title="SDK Type Reference" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                All SDK types are exported from the main entry point. <InlineCode>MultiModelChatCompletionResponse</InlineCode> is the key type for multi-model calls.
              </p>
              <LangTabs activeLang={activeLang} onChange={setActiveLang} />
              <LangCodeBlock codes={CODES.sdks} activeLang={activeLang} />
            </section>
          </main>

          {/* ── Right TOC ── */}
          <aside
            className="hidden xl:block sticky bg-white border-l border-slate-100 overflow-y-auto"
            style={{ top: "86px", height: "calc(100vh - 86px)" }}
          >
            <div className="px-5 py-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">On this page</p>
              <nav className="flex flex-col gap-0.5">
                {FLAT_SECTIONS.map(item => {
                  const isActive = active === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`text-[12.5px] px-3 py-1 rounded-lg border-l-2 transition-all ${
                        isActive
                          ? "text-indigo-600 border-indigo-500 bg-indigo-50 font-semibold"
                          : "text-slate-400 border-transparent hover:text-slate-600"
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-6 pt-5 border-t border-slate-100">
                <a
                  href="https://github.com"
                  className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                >
                  <ExternalLink size={11} />Edit on GitHub
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
