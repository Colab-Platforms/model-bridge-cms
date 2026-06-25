import redisClient from "../redis/index.js";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await redisClient.get<T>(key);
  } catch (error) {
    console.error("[Cache] GET error:", key, error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  try {
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("[Cache] SET error:", key, error);
  }
}

export async function cacheInvalidate(...keys: string[]) {
  if (keys.length) await redisClient.del(...keys);
}

// Invalidate all keys matching a pattern (e.g. "models:*")
export async function cacheInvalidatePattern(pattern: string) {
  const keys = await redisClient.keys(pattern);
  if (keys.length) await redisClient.del(...keys);
}
