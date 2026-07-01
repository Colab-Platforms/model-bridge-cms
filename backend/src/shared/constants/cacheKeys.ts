export const CACHE_KEYS = {
  MODELS: {
    LIST: (page: number, pageSize: number, providerId?: string, slug?: string, isActive?: boolean) => 
      `models:list:${page}:${pageSize}:${providerId ?? ""}:${slug ?? ""}:${isActive ?? ""}`,
    BY_ID: (id: string) => `models:id:${id}`,
    LIST_PATTERN: "models:list:*",
  },
  OVERVIEW: {
    USER: (userId: string, preset: string, from?: string, to?: string) => 
      `overview:${userId}:${preset}:${from ?? ""}:${to ?? ""}`,
    ADMIN: (preset: string, from?: string, to?: string) => 
      `admin:overview:${preset}:${from ?? ""}:${to ?? ""}`,
  },
} as const;

export const CACHE_TTL = {
  MODELS: 300, // 5 minutes
  OVERVIEW: {
    TODAY: 60,
    WEEKLY: 120,
    MONTHLY: 300,
    YEARLY: 600,
    DEFAULT: 120,
  }
} as const;
