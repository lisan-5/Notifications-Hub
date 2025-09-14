import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { notificationRoutes } from "./routes/notifications"
import { userRoutes } from "./routes/users"
import { healthRoutes } from "./routes/health"
import { emailRoutes } from "./routes/email"
import { smsRoutes } from "./routes/sms"
import { pushRoutes } from "./routes/push"
import { queueRoutes } from "./routes/queue"
import { analyticsRoutes } from "./routes/analytics"
import { testConnection } from "./database/connection"
import { NotificationQueueProcessor } from "./services/NotificationQueueProcessor"

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

let queueProcessor: NotificationQueueProcessor

// Routes
app.use("/api/health", healthRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/users", userRoutes)
app.use("/api/email", emailRoutes)
app.use("/api/sms", smsRoutes)
app.use("/api/push", pushRoutes)
app.use("/api/queue", queueRoutes)
app.use("/api/analytics", analyticsRoutes)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

async function startServer() {
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error("Failed to connect to database. Exiting...")
    process.exit(1)
  }

  try {
    queueProcessor = new NotificationQueueProcessor()
    console.log("🔄 Queue processor initialized successfully")
  } catch (error: any) {
    console.error("Failed to initialize queue processor:", error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`🚀 Notifications Hub API running on port ${PORT}`)
    console.log(`📊 Database connected successfully`)
    console.log(`🔄 Queue processor running with 10 concurrent workers`)
    console.log(`📧 Email service ready`)
    console.log(`📱 SMS service ready`)
    console.log(`🔔 Push notification service ready`)
    console.log(`💬 Slack service ready`)
    console.log(`📲 Telegram service ready`)
  })
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...")
  if (queueProcessor) {
    await queueProcessor.shutdown()
  }
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...")
  if (queueProcessor) {
    await queueProcessor.shutdown()
  }
  process.exit(0)
})

startServer().catch((error) => {
  console.error("Failed to start server:", error)
  process.exit(1)
})

export { queueProcessor }
