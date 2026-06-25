import "dotenv/config";
import { Redis } from "@upstash/redis";

async function testRedis() {
  console.log("URL:", process.env.UPSTASH_REDIS_REST_URL);
  console.log("Token set:", !!process.env.UPSTASH_REDIS_REST_TOKEN);

  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  await client.set("test:ping", "pong", { ex: 60 });
  const value = await client.get("test:ping");
  console.log("Read back:", value); // should print "pong"
}

testRedis().catch(console.error);
