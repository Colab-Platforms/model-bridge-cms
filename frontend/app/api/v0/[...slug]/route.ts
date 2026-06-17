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

  if (resource === "projects") return ok(mockProjects);

  if (resource === "users" && id === "me") return ok(mockUser);

  if (resource === "sessions") return ok(mockSessions);

  if (resource === "activity") {
    const page = parseInt(sp.get("page") ?? "1");
    const limit = parseInt(sp.get("limit") ?? "20");
    const sliced = mockActivity.slice((page - 1) * limit, page * limit);
    return ok({ data: sliced, total: mockActivity.length, page, limit });
  }

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

    const q              = sp.get("q")?.toLowerCase();
    const caps           = sp.getAll("capability");
    const providers      = sp.getAll("providerId");
    const inModalities   = sp.getAll("inputModality");
    const outModalities  = sp.getAll("outputModality");
    const minContext     = sp.get("minContext") ? parseInt(sp.get("minContext")!) : null;
    const maxInput       = sp.get("maxInputPrice") ? parseFloat(sp.get("maxInputPrice")!) : null;
    const maxOutput      = sp.get("maxOutputPrice") ? parseFloat(sp.get("maxOutputPrice")!) : null;
    const sort           = sp.get("sort");

    let models = [...mockModels];

    if (q)
      models = models.filter((m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
      );

    if (caps.length)
      models = models.filter((m) =>
        caps.some((c) => m.defaultForCapabilities.includes(c))
      );

    if (providers.length)
      models = models.filter((m) => providers.includes(m.provider.id));

    if (inModalities.length)
      models = models.filter((m) =>
        inModalities.some((mod) => m.inputModalities.includes(mod))
      );

    if (outModalities.length)
      models = models.filter((m) =>
        outModalities.some((mod) => m.outputModalities.includes(mod))
      );

    if (minContext !== null)
      models = models.filter(
        (m) => m.contextLength !== null && m.contextLength >= minContext
      );

    if (maxInput !== null)
      models = models.filter(
        (m) => parseFloat(m.inputPricePer1m) <= maxInput
      );

    if (maxOutput !== null)
      models = models.filter(
        (m) => parseFloat(m.outputPricePer1m) <= maxOutput
      );

    if (sort === "price_input_asc")
      models.sort((a, b) => parseFloat(a.inputPricePer1m) - parseFloat(b.inputPricePer1m));
    else if (sort === "price_input_desc")
      models.sort((a, b) => parseFloat(b.inputPricePer1m) - parseFloat(a.inputPricePer1m));
    else if (sort === "price_output_asc")
      models.sort((a, b) => parseFloat(a.outputPricePer1m) - parseFloat(b.outputPricePer1m));
    else if (sort === "price_output_desc")
      models.sort((a, b) => parseFloat(b.outputPricePer1m) - parseFloat(a.outputPricePer1m));
    else if (sort === "context_asc")
      models.sort((a, b) => (a.contextLength ?? 0) - (b.contextLength ?? 0));
    else if (sort === "context_desc")
      models.sort((a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0));
    else if (sort === "name_asc")
      models.sort((a, b) => a.displayName.localeCompare(b.displayName));
    else
      models.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const page  = parseInt(sp.get("page")  ?? "1");
    const limit = parseInt(sp.get("limit") ?? "20");
    const total = models.length;
    const sliced = models.slice((page - 1) * limit, page * limit);
    return ok({ status: true, data: { data: sliced, total, page, limit }, message: "Success" });
  }

  if (resource === "credits") {
    if (id === "balance") return ok(mockCreditBalance);
    if (id === "transactions") {
      const page = parseInt(sp.get("page") ?? "1");
      const limit = parseInt(sp.get("limit") ?? "20");
      const sliced = mockTransactions.slice((page - 1) * limit, page * limit);
      return ok({ data: sliced, total: mockTransactions.length, page, limit });
    }
  }

  if (resource === "wallets") {
    if (id === "balance") return ok({ balance: mockCreditBalance.balance });
    if (id === "transactions") {
      const page  = parseInt(sp.get("page")  ?? "1");
      const limit = parseInt(sp.get("limit") ?? "20");
      const sliced = mockTransactions.slice((page - 1) * limit, page * limit);
      return ok({ data: sliced, total: mockTransactions.length, page, limit });
    }
    if (!id) return ok({ id: "wallet_mock", balance: mockCreditBalance.balance });
  }

  return notFound();
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id, action] = slug;

  // Mock auth
  if (resource === "auth" && (id === "login" || id === "register")) {
    return ok({
      user: mockUser,
      tokens: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
      },
    });
  }

  if (resource === "auth" && id === "refresh") {
    return ok({ tokens: { accessToken: "mock-access-token-refreshed" } });
  }

  if (resource === "auth" && id === "logout") {
    return ok({ success: true });
  }

  if (resource === "auth" && id === "logout-all") {
    return ok({ success: true });
  }

  // Create wallet for current user
  if (resource === "wallets" && !id) {
    return ok({ id: "wallet_mock", balance: mockCreditBalance.balance }, 201);
  }

  // Self top-up
  if (resource === "wallets" && id === "me" && action === "add-balance") {
    const body   = await req.json().catch(() => ({}));
    const amount = parseFloat(body.amount ?? "0");
    if (!amount || amount <= 0)
      return NextResponse.json({ status: false, data: null, message: "Invalid amount" }, { status: 400 });
    const prev    = parseFloat(mockCreditBalance.balance);
    const next    = prev + amount;
    mockCreditBalance.balance = next.toFixed(2);
    const newTx = {
      id:            `txn_${Date.now()}`,
      type:          "TOPUP",
      amount:        amount.toFixed(2),
      balanceBefore: prev.toFixed(2),
      balanceAfter:  next.toFixed(2),
      description:   body.description ?? "Manual top-up",
      usageLogId:    null,
      createdAt:     new Date().toISOString(),
    };
    mockTransactions.unshift(newTx);
    return ok({ balance: mockCreditBalance.balance, transaction: newTx }, 201);
  }

  if (resource === "api-keys" && id && action === "rotate") {
    const existing = mockApiKeys.find((k) => k.id === id);
    const prefix = `mb-sk-rot${Date.now().toString(36).slice(-5)}`;
    return ok({
      ...(existing ?? {}),
      keyPrefix: prefix,
      apiKey: `${prefix}${"x".repeat(20)}`,
    });
  }

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

  return notFound();
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id] = slug;
  const body = await req.json().catch(() => ({}));

  if (resource === "users" && id === "me") {
    return ok({ ...mockUser, ...body });
  }

  if (resource === "api-keys" && id) {
    const key = mockApiKeys.find((k) => k.id === id);
    return key ? ok({ ...key, ...body }) : notFound();
  }

  return notFound();
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Context) {
  const { slug } = await params;
  const [resource, id] = slug;

  if (resource === "api-keys" && id) return ok({ success: true });
  if (resource === "sessions") return ok({ success: true });

  return notFound();
}
