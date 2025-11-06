/**
 * KV Storage Abstraction
 * 
 * Uses ioredis for local development and @vercel/kv for production
 */

import { kv as vercelKV } from "@vercel/kv";
import Redis from "ioredis";

// Check if we're in local testing mode
// Only use local Redis if explicitly in testing mode
// In production, always use Vercel KV (via @vercel/kv SDK)
const isLocalMode = process.env.TESTING_MODE === "true";

// Create local Redis client (only in testing mode)
let localRedis: Redis | null = null;

if (isLocalMode) {
  const redisUrl = process.env.KV_URL || "redis://localhost:6379";
  localRedis = new Redis(redisUrl);
  
  localRedis.on("connect", () => {
    console.log("✅ Connected to local Redis (testing mode)");
  });
  
  localRedis.on("error", (err) => {
    console.error("❌ Local Redis error:", err);
  });
  
  console.log("🧪 Running in TESTING MODE - using local Redis");
} else {
  console.log("🚀 Running in PRODUCTION MODE - using Vercel KV");
}

/**
 * KV interface that works with both local Redis and Vercel KV
 */
export const kv = {
  // String operations
  async get<T = string>(key: string): Promise<T | null> {
    if (isLocalMode && localRedis) {
      const value = await localRedis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }
    return vercelKV.get<T>(key);
  },

  async set(
    key: string,
    value: any,
    options?: { ex?: number; px?: number }
  ): Promise<string> {
    if (isLocalMode && localRedis) {
      const serialized = JSON.stringify(value);
      if (options?.ex) {
        await localRedis.set(key, serialized, "EX", options.ex);
      } else if (options?.px) {
        await localRedis.set(key, serialized, "PX", options.px);
      } else {
        await localRedis.set(key, serialized);
      }
      return "OK";
    }
    return vercelKV.set(key, value, options as any) as Promise<string>;
  },

  async del(key: string): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.del(key);
    }
    return vercelKV.del(key);
  },

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.sadd(key, ...members);
    }
    return vercelKV.sadd(key, ...members);
  },

  async srem(key: string, ...members: string[]): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.srem(key, ...members);
    }
    return vercelKV.srem(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    if (isLocalMode && localRedis) {
      return localRedis.smembers(key);
    }
    return vercelKV.smembers(key);
  },

  async sismember(key: string, member: string): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.sismember(key, member);
    }
    return vercelKV.sismember(key, member);
  },

  // Sorted set operations
  async zadd(
    key: string,
    score: number,
    member: string,
    ...args: (number | string)[]
  ): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.zadd(key, score, member, ...args);
    }
    return vercelKV.zadd(key, { score, member }, ...args);
  },

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.zrem(key, ...members);
    }
    return vercelKV.zrem(key, ...members);
  },

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { withScores?: boolean; rev?: boolean }
  ): Promise<string[]> {
    if (isLocalMode && localRedis) {
      const args: any[] = [key, start, stop];
      if (options?.rev) args.push("REV");
      if (options?.withScores) args.push("WITHSCORES");
      return localRedis.zrange(...args);
    }
    return vercelKV.zrange(key, start, stop, options as any);
  },

  async zremrangebyscore(
    key: string,
    min: number,
    max: number
  ): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.zremrangebyscore(key, min, max);
    }
    return vercelKV.zremrangebyscore(key, min, max);
  },

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.lpush(key, ...values);
    }
    return vercelKV.lpush(key, ...values);
  },

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (isLocalMode && localRedis) {
      return localRedis.lrange(key, start, stop);
    }
    return vercelKV.lrange(key, start, stop);
  },

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (isLocalMode && localRedis) {
      return localRedis.ltrim(key, start, stop);
    }
    return vercelKV.ltrim(key, start, stop);
  },

  // Increment operation
  async incr(key: string): Promise<number> {
    if (isLocalMode && localRedis) {
      return localRedis.incr(key);
    }
    return vercelKV.incr(key);
  },
};

// Cleanup on process exit
if (isLocalMode && localRedis) {
  process.on("SIGINT", () => {
    localRedis?.disconnect();
    process.exit(0);
  });
  
  process.on("SIGTERM", () => {
    localRedis?.disconnect();
    process.exit(0);
  });
}

