import { NotificationQueueProcessor } from "./services/NotificationQueueProcessor"
import { testConnection } from "./database/connection"

async function startWorker() {
  console.log("🔄 Starting notification worker...")

  // Test database connection
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error("Failed to connect to database. Exiting...")
    process.exit(1)
  }

  // Initialize queue processor
  const queueProcessor = new NotificationQueueProcessor()

  console.log("✅ Notification worker started successfully")
  console.log("🔄 Processing notifications with 10 concurrent workers")

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log("Shutting down worker gracefully...")
    await queueProcessor.shutdown()
    process.exit(0)
  }

  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)

  // Health check endpoint for worker monitoring
  setInterval(async () => {
    const health = await queueProcessor.healthCheck()
    if (!health.healthy) {
      console.error("Worker health check failed:", health.details)
    }
  }, 30000) // Check every 30 seconds
}

startWorker().catch((error) => {
  console.error("Failed to start worker:", error)
  process.exit(1)
})
