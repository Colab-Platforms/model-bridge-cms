type Preset = "7d" | "30d" | "90d" | "custom";

interface StatsSummary {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalSpendUsd: number;
  avgLatencyMs: number;
}
interface ModelBreakdown {
  model: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
}
interface KeyBreakdown {
  keyPrefix: string;
  requestCount: number;
  totalCostUsd: number;
}
interface StatsResponse {
  summary: StatsSummary;
  dailySpend: { date: string; costUsd: number }[];
  modelBreakdown: ModelBreakdown[];
  keyBreakdown: KeyBreakdown[];
}

// Copy this helper verbatim from usage/page.tsx
function presetDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}
