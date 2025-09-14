import { Router } from "express"
import { body, validationResult } from "express-validator"
import { EmailService, EmailTemplates } from "../services/channels/EmailService"

const router = Router()
const emailService = new EmailService()

// Send single email
router.post(
  "/send",
  [
    body("to").isEmail().withMessage("Valid email address is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("content").notEmpty().withMessage("Content is required"),
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

      const { to, subject, content, html, attachments, replyTo, cc, bcc, priority } = req.body

      const result = await emailService.sendEmail({
        to,
        subject,
        content,
        html,
        attachments,
        replyTo,
        cc,
        bcc,
        priority,
      })

      res.json({
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully",
      })
    } catch (error: any) {
      console.error("[v0] Email send error:", error)
      res.status(500).json({
        error: "Failed to send email",
        message: error.message,
      })
    }
  },
)

// Send email with template
router.post(
  "/send-template",
  [
    body("to").isEmail().withMessage("Valid email address is required"),
    body("template").isIn(Object.keys(EmailTemplates)).withMessage("Invalid template"),
    body("variables").optional().isObject().withMessage("Variables must be an object"),
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

      const { to, template, variables = {} } = req.body
      const emailTemplate = EmailTemplates[template as keyof typeof EmailTemplates]

      const result = await emailService.sendWithTemplate(to, emailTemplate, variables)

      res.json({
        success: true,
        messageId: result.messageId,
        message: "Template email sent successfully",
      })
    } catch (error: any) {
      console.error("[v0] Template email send error:", error)
      res.status(500).json({
        error: "Failed to send template email",
        message: error.message,
      })
    }
  },
)

// Send bulk emails
router.post("/send-bulk", [body("emails").isArray().withMessage("Emails must be an array")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { emails } = req.body

    // Validate each email in the array
    for (const email of emails) {
      if (!email.to || !email.subject || !email.content) {
        return res.status(400).json({
          error: "Each email must have to, subject, and content fields",
        })
      }
    }

    const results = await emailService.sendBulk(emails)

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    res.json({
      success: true,
      message: `Bulk email completed: ${successful} sent, ${failed} failed`,
      results,
      summary: {
        total: emails.length,
        successful,
        failed,
      },
    })
  } catch (error: any) {
    console.error("[v0] Bulk email send error:", error)
    res.status(500).json({
      error: "Failed to send bulk emails",
      message: error.message,
    })
  }
})

// Verify email service configuration
router.get("/verify", async (req, res) => {
  try {
    const isVerified = await emailService.verify()
    const status = emailService.getStatus()

    res.json({
      verified: isVerified,
      configured: status.configured,
      host: status.host,
      user: status.user,
    })
  } catch (error: any) {
    console.error("[v0] Email verification error:", error)
    res.status(500).json({
      error: "Failed to verify email service",
      message: error.message,
    })
  }
})

// Get available templates
router.get("/templates", (req, res) => {
  const templates = Object.keys(EmailTemplates).map((key) => ({
    name: key,
    subject: EmailTemplates[key as keyof typeof EmailTemplates].subject,
  }))

  res.json({
    templates,
  })
})

export { router as emailRoutes }
