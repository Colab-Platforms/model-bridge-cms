"use client" ;

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
}

export function ModelPieChart({data}:{data: ModelItem[]}) {
    const total = data.reduce((s,d) => s + d.requestCount, 0);

    if(!data.length || total === 0) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No model usage data for this period
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                  <Pie
          data={data}
          dataKey="requestCount"
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
          formatter={(v: number) => [
            `${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`,
            "Requests",
          ]}
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
    )
       
}