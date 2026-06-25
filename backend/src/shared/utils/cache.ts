import redisClient from "../redis/index.js";

const isRedisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured) return null;

  try {
    const data = await redisClient.get<T>(key);
    if (data) {
      console.log(`[Cache] HIT: ${key}`);
    } else {
      console.log(`[Cache] MISS: ${key}`);
    }
    return data;
  } catch (error) {
    console.error(`[Cache] GET error for key "${key}":`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  if (!isRedisConfigured) return;

  try {
    // Basic TTL check
    const ttl = Math.max(0, ttlSeconds);
    await redisClient.set(key, value, { ex: ttl });
    console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`[Cache] SET error for key "${key}":`, error);
    
    // Check for common serialization errors
    if (error instanceof TypeError && error.message.includes("BigInt")) {
      console.error("[Cache] FATAL: Cannot serialize BigInt. Please convert BigInt values to numbers or strings before caching.");
    }
  }
}

export async function cacheInvalidate(...keys: string[]) {
  if (!isRedisConfigured || !keys.length) return;
  try {
    await redisClient.del(...keys);
    console.log(`[Cache] INVALIDATE: ${keys.join(", ")}`);
  } catch (error) {
    console.error("[Cache] INVALIDATE error:", error);
  }
}

// Invalidate all keys matching a pattern (e.g. "models:*")
export async function cacheInvalidatePattern(pattern: string) {
  if (!isRedisConfigured) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) {
      await redisClient.del(...keys);
      console.log(`[Cache] INVALIDATE PATTERN "${pattern}": ${keys.length} keys removed`);
    }
  } catch (error) {
    console.error(`[Cache] INVALIDATE PATTERN "${pattern}" error:`, error);
  }
}
