import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Model, ModelFilters, ModelUsageStats, PaginatedModels } from "@/types/index";
import { buildModelsQueryString } from "@/lib/modelUtils";

function normalizeModel(m: Model): Model {
  return {
    ...m,
    inputPricePer1m: m.inputPricePerToken
      ? (parseFloat(m.inputPricePerToken) * 1_000_000).toFixed(6)
      : (m.inputPricePer1m ?? "0"),
    outputPricePer1m: m.outputPricePerToken
      ? (parseFloat(m.outputPricePerToken) * 1_000_000).toFixed(6)
      : (m.outputPricePer1m ?? "0"),
  };
}

// Handles both the old flat array response and the new paginated response.
function normalizePaginatedResponse(raw: PaginatedModels | Model[]): PaginatedModels {
  if (Array.isArray(raw)) {
    const data = raw.map(normalizeModel);
    return { data, totalRecords: data.length, currentPage: 1, pageSize: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
  }
  return { ...raw, data: raw.data.map(normalizeModel) };
}

export function useModels(filters: ModelFilters, options: { staleTime?: number; enabled?: boolean } = {}) {
  const qs = buildModelsQueryString(filters);
  const url = qs ? `/models?${qs}` : "/models";

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedModels>({
    queryKey: ["models", filters],
    queryFn: () =>
      api
        .get<PaginatedModels | Model[]>(url)
        .then((r) => normalizePaginatedResponse(r.data as PaginatedModels | Model[])),
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    enabled: options.enabled !== false,
  });

  return {
    models: data?.data,
    total: data?.totalRecords,
    page: data?.currentPage,
    limit: data?.pageSize,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useModelBySlug(slug: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<Model>({
    queryKey: ["models", "detail", slug],
    queryFn: () =>
      api
        .get<PaginatedModels | Model[]>(`/models?slug=${slug}`)
        .then((r) => {
          const raw = r.data as PaginatedModels | Model[];
          const model = Array.isArray(raw) ? raw[0] : raw.data[0];
          return normalizeModel(model);
        }),
    initialData: () => {
      const cached = queryClient.getQueriesData<PaginatedModels>({ queryKey: ["models"] });
      for (const [, result] of cached) {
        if (!result?.data || !Array.isArray(result.data)) continue;
        const match = result.data.find((m) => m.slug === slug);
        if (match) return match;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { model: data, isLoading, isError };
}

export function useModelUsageStats(modelId: string, enabled: boolean) {
  const { data, isLoading, isError, refetch } = useQuery<ModelUsageStats>({
    queryKey: ["usage", "stats", "model", modelId],
    queryFn: () =>
      api.get<ModelUsageStats>(`/usage/stats?modelId=${modelId}`).then((r) => r.data),
    enabled,
  });

  return { stats: data, isLoading, isError, refetch };
}
