import { Router } from "express"
import { NotificationService } from "../services/NotificationService"

const router = Router()
const notificationService = new NotificationService()

// Get queue statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await notificationService.getQueueStats()
    res.json(stats)
  } catch (error: any) {
    console.error("[v0] Queue stats error:", error)
    res.status(500).json({
      error: "Failed to get queue stats",
      message: error.message,
    })
  }
})

// Pause queue processing
router.post("/pause", async (req, res) => {
  try {
    await notificationService.pauseQueue()
    res.json({
      success: true,
      message: "Queue paused successfully",
    })
  } catch (error: any) {
    console.error("[v0] Queue pause error:", error)
    res.status(500).json({
      error: "Failed to pause queue",
      message: error.message,
    })
  }
})

// Resume queue processing
router.post("/resume", async (req, res) => {
  try {
    await notificationService.resumeQueue()
    res.json({
      success: true,
      message: "Queue resumed successfully",
    })
  } catch (error: any) {
    console.error("[v0] Queue resume error:", error)
    res.status(500).json({
      error: "Failed to resume queue",
      message: error.message,
    })
  }
})

// Clear failed jobs
router.post("/clear-failed", async (req, res) => {
  try {
    await notificationService.clearFailedJobs()
    res.json({
      success: true,
      message: "Failed jobs cleared successfully",
    })
  } catch (error: any) {
    console.error("[v0] Clear failed jobs error:", error)
    res.status(500).json({
      error: "Failed to clear failed jobs",
      message: error.message,
    })
  }
})

// Retry all failed jobs
router.post("/retry-failed", async (req, res) => {
  try {
    await notificationService.retryAllFailedJobs()
    res.json({
      success: true,
      message: "Failed jobs retried successfully",
    })
  } catch (error: any) {
    console.error("[v0] Retry failed jobs error:", error)
    res.status(500).json({
      error: "Failed to retry failed jobs",
      message: error.message,
    })
  }
})

// Get system health
router.get("/health", async (req, res) => {
  try {
    const health = await notificationService.getSystemHealth()
    res.json(health)
  } catch (error: any) {
    console.error("[v0] System health error:", error)
    res.status(500).json({
      error: "Failed to get system health",
      message: error.message,
    })
  }
})

export { router as queueRoutes }
