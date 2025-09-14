import { Router } from "express"
import { body, validationResult } from "express-validator"
import { SMSService } from "../services/channels/SMSService"

const router = Router()
const smsService = new SMSService()

// Send single SMS
router.post(
  "/send",
  [
    body("to").isMobilePhone().withMessage("Valid phone number is required"),
    body("message").notEmpty().withMessage("Message is required"),
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

      const { to, message, mediaUrl, statusCallback, maxPrice } = req.body

      const result = await smsService.sendSMS({
        to,
        message,
        mediaUrl,
        statusCallback,
        maxPrice,
      })

      if (result.success) {
        res.json({
          success: true,
          messageId: result.messageId,
          status: result.status,
          message: "SMS sent successfully",
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        })
      }
    } catch (error: any) {
      console.error("[v0] SMS send error:", error)
      res.status(500).json({
        error: "Failed to send SMS",
        message: error.message,
      })
    }
  },
)

// Send bulk SMS
router.post("/send-bulk", [body("messages").isArray().withMessage("Messages must be an array")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { messages } = req.body

    // Validate each message in the array
    for (const msg of messages) {
      if (!msg.to || !msg.message) {
        return res.status(400).json({
          error: "Each message must have to and message fields",
        })
      }
    }

    const results = await smsService.sendBulk(messages)

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    res.json({
      success: true,
      message: `Bulk SMS completed: ${successful} sent, ${failed} failed`,
      results,
      summary: {
        total: messages.length,
        successful,
        failed,
      },
    })
  } catch (error: any) {
    console.error("[v0] Bulk SMS send error:", error)
    res.status(500).json({
      error: "Failed to send bulk SMS",
      message: error.message,
    })
  }
})

// Get message status
router.get("/status/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params
    const status = await smsService.getMessageStatus(messageId)

    res.json({
      messageId,
      ...status,
    })
  } catch (error: any) {
    console.error("[v0] SMS status check error:", error)
    res.status(500).json({
      error: "Failed to get message status",
      message: error.message,
    })
  }
})

// Verify SMS service configuration
router.get("/verify", async (req, res) => {
  try {
    const isVerified = await smsService.verify()
    const status = smsService.getStatus()

    res.json({
      verified: isVerified,
      configured: status.configured,
      fromNumber: status.fromNumber,
      accountSid: status.accountSid,
    })
  } catch (error: any) {
    console.error("[v0] SMS verification error:", error)
    res.status(500).json({
      error: "Failed to verify SMS service",
      message: error.message,
    })
  }
})

// Validate phone number
router.post("/validate-phone", [body("phoneNumber").notEmpty().withMessage("Phone number is required")], (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { phoneNumber } = req.body
    const isValid = smsService.validatePhoneNumber(phoneNumber)

    res.json({
      phoneNumber,
      valid: isValid,
    })
  } catch (error: any) {
    console.error("[v0] Phone validation error:", error)
    res.status(500).json({
      error: "Failed to validate phone number",
      message: error.message,
    })
  }
})

export { router as smsRoutes }
