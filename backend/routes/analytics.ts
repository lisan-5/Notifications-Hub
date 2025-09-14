import { Router } from "express"
import { NotificationModel, NotificationLogModel } from "../database/models/Notification"

const router = Router()

// Get comprehensive analytics
router.get("/", async (req, res) => {
  try {
    const stats = await NotificationModel.getNotificationStats()

    // Get channel breakdown
    const channelResult = await require("../database/connection").query(`
      SELECT channel, COUNT(*) as count
      FROM notifications 
      WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
      GROUP BY channel
    `)

    const channelBreakdown: Record<string, number> = {}
    for (const row of channelResult.rows) {
      channelBreakdown[row.channel] = Number.parseInt(row.count)
    }

    // Get hourly activity for the last 24 hours
    const activityResult = await require("../database/connection").query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM notifications 
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `)

    const recentActivity = activityResult.rows.map((row: any) => ({
      hour: row.hour,
      sent: Number.parseInt(row.sent),
      failed: Number.parseInt(row.failed),
    }))

    res.json({
      totalNotifications: stats.total || 0,
      successRate: stats.total > 0 ? ((stats.sent || 0) / stats.total) * 100 : 0,
      channelBreakdown,
      statusBreakdown: {
        sent: stats.sent || 0,
        failed: stats.failed || 0,
        pending: stats.pending || 0,
        processing: stats.processing || 0,
        queued: stats.queued || 0,
      },
      recentActivity,
    })
  } catch (error: any) {
    console.error("[v0] Analytics error:", error)
    res.status(500).json({
      error: "Failed to get analytics",
      message: error.message,
    })
  }
})

// Get error logs
router.get("/errors", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 50
    const errorLogs = await NotificationLogModel.getErrorLogs(limit)

    res.json({
      errors: errorLogs,
    })
  } catch (error: any) {
    console.error("[v0] Error logs error:", error)
    res.status(500).json({
      error: "Failed to get error logs",
      message: error.message,
    })
  }
})

// Get recent activity logs
router.get("/logs", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 100
    const logs = await NotificationLogModel.getRecentLogs(limit)

    res.json({
      logs,
    })
  } catch (error: any) {
    console.error("[v0] Recent logs error:", error)
    res.status(500).json({
      error: "Failed to get recent logs",
      message: error.message,
    })
  }
})

export { router as analyticsRoutes }
