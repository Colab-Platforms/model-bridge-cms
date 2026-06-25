import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn("⚠️ [Redis] Connection credentials missing. Caching will be disabled or fail.");
} else {
  const url = new URL(redisUrl);
  console.log("🚀 [Redis] Initializing client for:", url.hostname); 
}

export const redisClient = new Redis({
  url: redisUrl || "",
  token: redisToken || "",
});

export default redisClient;
