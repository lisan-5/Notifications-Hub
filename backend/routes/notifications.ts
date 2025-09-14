import { Router } from "express"
import { body, validationResult } from "express-validator"
import { NotificationService } from "../services/NotificationService"

const router = Router()
const notificationService = new NotificationService()

// Send notification
router.post(
  "/send",
  [
    body("userId").isString().notEmpty(),
    body("channels").isArray().notEmpty(),
    body("message.title").isString().notEmpty(),
    body("message.body").isString().notEmpty(),
    body("priority").isIn(["low", "normal", "high", "urgent"]).optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const notification = await notificationService.sendNotification(req.body)
      res.status(201).json({
        success: true,
        notificationId: notification.id,
        message: "Notification queued successfully",
      })
    } catch (error) {
      console.error("Error sending notification:", error)
      res.status(500).json({
        success: false,
        error: "Failed to queue notification",
      })
    }
  },
)

// Get notification status
router.get("/:id/status", async (req, res) => {
  try {
    const status = await notificationService.getNotificationStatus(req.params.id)
    if (!status) {
      return res.status(404).json({ error: "Notification not found" })
    }
    res.json(status)
  } catch (error) {
    console.error("Error fetching notification status:", error)
    res.status(500).json({ error: "Failed to fetch notification status" })
  }
})

// Get user notifications
router.get("/user/:userId", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const notifications = await notificationService.getUserNotifications(
      req.params.userId,
      Number.parseInt(page as string),
      Number.parseInt(limit as string),
    )
    res.json(notifications)
  } catch (error) {
    console.error("Error fetching user notifications:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

// Retry failed notification
router.post("/:id/retry", async (req, res) => {
  try {
    const result = await notificationService.retryNotification(req.params.id)
    res.json({ success: true, message: "Notification retry queued" })
  } catch (error) {
    console.error("Error retrying notification:", error)
    res.status(500).json({ error: "Failed to retry notification" })
  }
})

export { router as notificationRoutes }
