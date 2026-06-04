"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-sky-500)",
  "var(--color-pink-500)",
  "var(--color-amber-500)",
];

interface ModelItem {
  model: string;
  requestCount: number;
  totalCostUsd: number;
}

type Metric = "requestCount" | "totalCostUsd";

export function ModelPieChart({ data }: { data: ModelItem[] }) {
  const [metric, setMetric] = useState<Metric>("requestCount");

  const total = data.reduce((s, d) => s + (metric === "requestCount" ? d.requestCount : d.totalCostUsd), 0);

  if (!data.length || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No model usage data for this period
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <div className="flex overflow-hidden rounded-xl border border-border self-start">
        {(["requestCount", "totalCostUsd"] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={[
              "px-3 py-1.5 text-xs font-medium transition-colors",
              metric === m
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            ].join(" ")}
          >
            {m === "requestCount" ? "Requests" : "Cost"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey={metric}
            nameKey="model"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
              const label = metric === "requestCount"
                ? `${n.toLocaleString()} (${pct}%)`
                : `$${n.toFixed(4)} (${pct}%)`;
              return [label, metric === "requestCount" ? "Requests" : "Cost"];
            }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => (
              <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
