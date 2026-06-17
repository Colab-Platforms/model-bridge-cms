"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-sky-500)",
  "var(--color-pink-500)",
  "var(--color-amber-500)",
];

export interface PieSlice {
  name: string;
  value: number;
  color?: string;
}

interface ModelPieChartProps {
  data: PieSlice[];
  formatter?: (value: number) => string;
  emptyMessage?: string;
}

export function ModelPieChart({
  data,
  formatter = (v) => v.toLocaleString(),
  emptyMessage = "No data for this period",
}: ModelPieChartProps) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((s, d) => s + d.value, 0);

  if (!visible.length || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={visible}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {visible.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color ?? COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
              return [`${formatter(n)} (${pct}%)`, ""];
            }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0px",
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
