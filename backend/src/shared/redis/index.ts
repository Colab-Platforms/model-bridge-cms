import Redis from "ioredis";

type RateLimitRedisClient = Redis & {
  rateLimitIncrement: (key: string, windowMs: number | string) => Promise<[number, number]>;
};

const RATE_LIMIT_INCREMENT_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

let redisClient: RateLimitRedisClient | null = null;
let missingRedisWarningLogged = false;

const isRailwayRuntime = () =>
  Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL
  );

const getRedisUrl = () => {
  if (isRailwayRuntime()) {
    return process.env.REDIS_INTERNAL_URL || process.env.REDIS_URL || "";
  }

  return process.env.REDIS_URL || process.env.REDIS_INTERNAL_URL || "";
};

const registerRateLimitCommand = (client: RateLimitRedisClient) => {
  client.defineCommand("rateLimitIncrement", {
    numberOfKeys: 1,
    lua: RATE_LIMIT_INCREMENT_LUA,
  });
};

export const isRedisConfigured = () => Boolean(getRedisUrl());

export const getRedisClient = (): RateLimitRedisClient | null => {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    if (!missingRedisWarningLogged) {
      console.warn("[Redis] REDIS_INTERNAL_URL/REDIS_URL is not configured. Rate limiting will use fallback behavior.");
      missingRedisWarningLogged = true;
    }
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  }) as RateLimitRedisClient;

  registerRateLimitCommand(redisClient);

  redisClient.on("connect", () => {
    console.info("[Redis] Connected");
  });

  redisClient.on("error", (error) => {
    console.error("[Redis] Connection error:", error);
  });

  redisClient.on("close", () => {
    console.warn("[Redis] Connection closed");
  });

  return redisClient;
};

export const disconnectRedis = async () => {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  try {
    await client.quit();
  } catch (error) {
    console.error("[Redis] Failed to close connection gracefully:", error);
    client.disconnect(false);
  }
};

export default getRedisClient;
