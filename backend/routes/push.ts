import { Router } from "express"
import { body, validationResult } from "express-validator"
import { PushService } from "../services/channels/PushService"

const router = Router()
const pushService = new PushService()

// Send single push notification
router.post(
  "/send",
  [
    body("token").notEmpty().withMessage("Device token is required"),
    body("title").notEmpty().withMessage("Title is required"),
    body("body").notEmpty().withMessage("Body is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { token, title, body, data, imageUrl, clickAction, badge, sound, priority, timeToLive, collapseKey } =
        req.body

      const result = await pushService.sendPush({
        token,
        title,
        body,
        data,
        imageUrl,
        clickAction,
        badge,
        sound,
        priority,
        timeToLive,
        collapseKey,
      })

      if (result.success) {
        res.json({
          success: true,
          messageId: result.messageId,
          message: "Push notification sent successfully",
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        })
      }
    } catch (error: any) {
      console.error("[v0] Push send error:", error)
      res.status(500).json({
        error: "Failed to send push notification",
        message: error.message,
      })
    }
  },
)

// Send multicast push notification
router.post(
  "/send-multicast",
  [
    body("tokens").isArray().withMessage("Tokens must be an array"),
    body("title").notEmpty().withMessage("Title is required"),
    body("body").notEmpty().withMessage("Body is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { tokens, title, body, data, imageUrl, clickAction, badge, sound, priority, timeToLive, collapseKey } =
        req.body

      const result = await pushService.sendMulticast(tokens, title, body, {
        data,
        imageUrl,
        clickAction,
        badge,
        sound,
        priority,
        timeToLive,
        collapseKey,
      })

      res.json({
        success: result.success,
        successCount: result.successCount,
        failureCount: result.failureCount,
        message: `Multicast push completed: ${result.successCount} sent, ${result.failureCount} failed`,
      })
    } catch (error: any) {
      console.error("[v0] Multicast push send error:", error)
      res.status(500).json({
        error: "Failed to send multicast push notification",
        message: error.message,
      })
    }
  },
)

// Send to topic
router.post(
  "/send-topic",
  [
    body("topic").notEmpty().withMessage("Topic is required"),
    body("title").notEmpty().withMessage("Title is required"),
    body("body").notEmpty().withMessage("Body is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { topic, title, body, data, imageUrl, clickAction, badge, sound, priority, timeToLive, collapseKey } =
        req.body

      const result = await pushService.sendToTopic(topic, title, body, {
        data,
        imageUrl,
        clickAction,
        badge,
        sound,
        priority,
        timeToLive,
        collapseKey,
      })

      if (result.success) {
        res.json({
          success: true,
          messageId: result.messageId,
          message: `Push notification sent to topic: ${topic}`,
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        })
      }
    } catch (error: any) {
      console.error("[v0] Topic push send error:", error)
      res.status(500).json({
        error: "Failed to send topic push notification",
        message: error.message,
      })
    }
  },
)

// Subscribe to topic
router.post(
  "/subscribe-topic",
  [
    body("tokens").isArray().withMessage("Tokens must be an array"),
    body("topic").notEmpty().withMessage("Topic is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { tokens, topic } = req.body

      const result = await pushService.subscribeToTopic(tokens, topic)

      res.json({
        success: true,
        successCount: result.successCount,
        failureCount: result.failureCount,
        message: `Subscribed ${result.successCount} tokens to topic: ${topic}`,
      })
    } catch (error: any) {
      console.error("[v0] Topic subscription error:", error)
      res.status(500).json({
        error: "Failed to subscribe to topic",
        message: error.message,
      })
    }
  },
)

// Unsubscribe from topic
router.post(
  "/unsubscribe-topic",
  [
    body("tokens").isArray().withMessage("Tokens must be an array"),
    body("topic").notEmpty().withMessage("Topic is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { tokens, topic } = req.body

      const result = await pushService.unsubscribeFromTopic(tokens, topic)

      res.json({
        success: true,
        successCount: result.successCount,
        failureCount: result.failureCount,
        message: `Unsubscribed ${result.successCount} tokens from topic: ${topic}`,
      })
    } catch (error: any) {
      console.error("[v0] Topic unsubscription error:", error)
      res.status(500).json({
        error: "Failed to unsubscribe from topic",
        message: error.message,
      })
    }
  },
)

// Verify push service configuration
router.get("/verify", async (req, res) => {
  try {
    const isVerified = await pushService.verify()
    const status = pushService.getStatus()

    res.json({
      verified: isVerified,
      configured: status.configured,
      projectId: status.projectId,
    })
  } catch (error: any) {
    console.error("[v0] Push verification error:", error)
    res.status(500).json({
      error: "Failed to verify push service",
      message: error.message,
    })
  }
})

export { router as pushRoutes }
