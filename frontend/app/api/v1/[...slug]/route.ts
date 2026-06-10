import { NextRequest, NextResponse } from "next/server";
import {
  mockUser,
  mockProjects,
  mockApiKeys,
  mockModels,
  mockUsageLogs,
  mockStats,
  mockSessions,
  mockActivity,
  mockTransactions,
  mockCreditBalance,
} from "@/mocks/data";

type Context = { params: Promise<{ slug: string[] }> };

const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const sp = req.nextUrl.searchParams;
  const [resource, id] = slug;

  // GET /api/v1/projects
  if (resource === "projects") return ok(mockProjects);

  // GET /api/v1/users/me
  if (resource === "users" && id === "me") return ok(mockUser);

  // GET /api/v1/sessions
  if (resource === "sessions") return ok(mockSessions);

  // GET /api/v1/activity
  if (resource === "activity") {
    const page = parseInt(sp.get("page") ?? "1");
    const limit = parseInt(sp.get("limit") ?? "20");
    const sliced = mockActivity.slice((page - 1) * limit, page * limit);
    return ok({ data: sliced, total: mockActivity.length, page, limit });
  }

  // GET /api/v1/api-keys  |  /api/v1/api-keys/:id
  if (resource === "api-keys") {
    if (!id) {
      const projectId = sp.get("projectId");
      const keys = projectId
        ? mockApiKeys.filter((k) => k.projectId === projectId)
        : mockApiKeys;
      return ok(keys);
    }
    const key = mockApiKeys.find((k) => k.id === id);
    return key ? ok(key) : notFound();
  }

  // GET /api/v1/usage/stats  |  /api/v1/usage/:id  |  /api/v1/usage
  if (resource === "usage") {
    if (id === "stats") return ok(mockStats);
    if (id) {
      const log = mockUsageLogs.find((l) => l.id === id);
      return log ? ok(log) : notFound();
    }
    const page = parseInt(sp.get("page") ?? "1");
    const limit = parseInt(sp.get("limit") ?? "20");
    const sliced = mockUsageLogs.slice((page - 1) * limit, page * limit);
    return ok({ data: sliced, total: mockUsageLogs.length, page, limit });
  }

  // GET /api/v1/models  |  /api/v1/models/:slug
  if (resource === "models") {
    if (id) {
      const model = mockModels.find((m) => m.slug === id);
      return model
        ? ok({ status: true, data: model, message: "Success" })
        : NextResponse.json(
            { status: false, data: null, message: "Not found" },
            { status: 404 }
          );
    }
    // Support capability / provider filters (used by FilterSidebar)
    const caps = sp.getAll("capability");
    const providers = sp.getAll("providerId");
    let models = mockModels;
    if (caps.length)
      models = models.filter((m) =>
        caps.some((c) => m.defaultForCapabilities.includes(c))
      );
    if (providers.length)
      models = models.filter((m) => providers.includes(m.provider.slug));
    return ok({ status: true, data: models, message: "Success" });
  }

  // GET /api/v1/credits/balance  |  /api/v1/credits/transactions
  if (resource === "credits") {
    if (id === "balance") return ok(mockCreditBalance);
    if (id === "transactions") {
      const page = parseInt(sp.get("page") ?? "1");
      const limit = parseInt(sp.get("limit") ?? "20");
      const sliced = mockTransactions.slice((page - 1) * limit, page * limit);
      return ok({ data: sliced, total: mockTransactions.length, page, limit });
    }
  }

  return notFound();
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id, action] = slug;

  // POST /api/v1/api-keys/:id/rotate
  if (resource === "api-keys" && id && action === "rotate") {
    const existing = mockApiKeys.find((k) => k.id === id);
    const prefix = `mb-sk-rot${Date.now().toString(36).slice(-5)}`;
    return ok({
      ...(existing ?? {}),
      keyPrefix: prefix,
      apiKey: `${prefix}${"x".repeat(20)}`,
    });
  }

  // POST /api/v1/api-keys — create a new key (returns the full secret once)
  if (resource === "api-keys" && !id) {
    const body = await req.json().catch(() => ({}));
    const prefix = `mb-sk-new${Date.now().toString(36).slice(-5)}`;
    const newKey = {
      id: `key_${Date.now()}`,
      projectId: body.projectId ?? "proj_01",
      keyPrefix: prefix,
      name: body.name ?? "New Key",
      status: "ACTIVE",
      creditLimit: body.creditLimit ?? null,
      limitType: body.limitType ?? null,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      apiKey: `${prefix}${"x".repeat(20)}`,
    };
    return ok(newKey, 201);
  }

  if (resource === "projects" && !id) {
  const body = await req.json().catch(() => ({}));
  const newProject = {
    id: `proj_${Date.now()}`,
    name: body.name,
    description: body.description ?? null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockProjects.push(newProject);
  return ok(newProject, 201);
}


  return notFound();
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id] = slug;
  const body = await req.json().catch(() => ({}));

  // PATCH /api/v1/users/me
  if (resource === "users" && id === "me") {
    return ok({ ...mockUser, ...body });
  }

  // PATCH /api/v1/api-keys/:id
  if (resource === "api-keys" && id) {
    const key = mockApiKeys.find((k) => k.id === id);
    return key ? ok({ ...key, ...body }) : notFound();
  }

  if (resource === "projects" && id) {
  const body = await req.json().catch(() => ({}));
  const idx = mockProjects.findIndex((p) => p.id === id);
  if (idx === -1) return notFound();
  mockProjects[idx] = { ...mockProjects[idx], ...body, updatedAt: new Date().toISOString() };
  return ok(mockProjects[idx]);
}


  return notFound();
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id] = slug;

  // DELETE /api/v1/api-keys/:id
  if (resource === "api-keys" && id) return ok({ success: true });

  // DELETE /api/v1/sessions/:id  |  DELETE /api/v1/sessions (revoke all)
  if (resource === "sessions") return ok({ success: true });

  if (resource === "projects" && id) {
  const idx = mockProjects.findIndex((p) => p.id === id);
  if (idx !== -1) mockProjects.splice(idx, 1);
  return ok({ success: true });
}


  return notFound();
}


