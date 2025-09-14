import { Redis } from "ioredis"

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
}

// Create Redis connection
export const redis = new Redis(redisConfig)

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping()
    console.log("Redis connected successfully")
    return true
  } catch (error) {
    console.error("Redis connection failed:", error)
    return false
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await redis.quit()
})

process.on("SIGINT", async () => {
  await redis.quit()
})
