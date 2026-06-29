import IORedis, { type RedisOptions } from "ioredis";

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
  };
  if (parsed.password) options.password = decodeURIComponent(parsed.password);
  if (parsed.username && parsed.username !== "default") {
    options.username = parsed.username;
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    options.db = parseInt(parsed.pathname.slice(1), 10);
  }
  return options;
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("⚠️  [BullMQ] REDIS_URL is not set. Job queues will not function.");
}

// Plain options object — safe to pass to Queue and Worker as { connection: redisConnectionOptions }.
// Passing an ioredis *instance* causes a type conflict because BullMQ bundles its own ioredis
// internally. A plain options object avoids the version mismatch entirely.
export const redisConnectionOptions: RedisOptions = {
  ...parseRedisUrl(redisUrl ?? "redis://localhost:6379"),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Standalone client — used for health checks and monitoring, not passed to BullMQ.
export const redisClient = new IORedis(redisConnectionOptions);

redisClient.on("connect", () => {
  console.log("✅ [BullMQ] Redis connected");
});

redisClient.on("error", (err: Error) => {
  console.error("❌ [BullMQ] Redis connection error:", err.message);
});

redisClient.on("close", () => {
  console.warn("⚠️  [BullMQ] Redis connection closed");
});
