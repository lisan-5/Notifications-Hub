import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface EmailOptions {
  to: string
  subject: string
  content: string
  html?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  priority?: "high" | "normal" | "low"
}

export class EmailService {
  private transporter: Transporter
  private isConfigured = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional configuration for better reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[v0] SMTP credentials not configured. Email service will be disabled.")
      this.isConfigured = false
      return
    }

    try {
      this.transporter = nodemailer.createTransporter(smtpConfig)
      this.isConfigured = true
      console.log("[v0] Email service initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize email service:", error)
      this.isConfigured = false
    }
  }

  async send(to: string, subject: string, content: string, metadata?: Record<string, any>): Promise<any> {
    if (!this.isConfigured) {
      throw new Error("Email service is not configured. Please check SMTP settings.")
    }

    const options: EmailOptions = {
      to,
      subject,
      content,
      html: this.isHTML(content) ? content : this.convertToHTML(content),
      ...metadata,
    }

    return this.sendEmail(options)
  }

  async sendEmail(options: EmailOptions): Promise<any> {
    if (!this.isConfigured) {
      throw new Error("Email service is not configured. Please check SMTP settings.")
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html || this.convertToHTML(options.content),
      text: this.stripHTML(options.html || options.content),
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
      priority: options.priority || "normal",
      headers: {
        "X-Mailer": "Notifications Hub v1.0",
        "X-Priority": options.priority === "high" ? "1" : options.priority === "low" ? "5" : "3",
      },
    }

    try {
      const result = await this.transporter.sendMail(mailOptions)
      console.log(`[v0] Email sent successfully to ${options.to}: ${result.messageId}`)

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        envelope: result.envelope,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to send email to ${options.to}:`, error.message)
      throw new Error(`Email delivery failed: ${error.message}`)
    }
  }

  async sendWithTemplate(to: string, template: EmailTemplate, variables: Record<string, string> = {}): Promise<any> {
    let { subject, html, text } = template

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, "g"), value)
      html = html.replace(new RegExp(placeholder, "g"), value)
      if (text) {
        text = text.replace(new RegExp(placeholder, "g"), value)
      }
    })

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || this.stripHTML(html),
      headers: {
        "X-Mailer": "Notifications Hub v1.0",
      },
    }

    try {
      const result = await this.transporter.sendMail(mailOptions)
      console.log(`[v0] Template email sent to ${to}: ${result.messageId}`)
      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to send template email to ${to}:`, error.message)
      throw new Error(`Template email delivery failed: ${error.message}`)
    }
  }

  async sendBulk(emails: EmailOptions[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    if (!this.isConfigured) {
      throw new Error("Email service is not configured. Please check SMTP settings.")
    }

    const results = []

    for (const email of emails) {
      try {
        const result = await this.sendEmail(email)
        results.push({ success: true, messageId: result.messageId })
      } catch (error: any) {
        results.push({ success: false, error: error.message })
      }
    }

    return results
  }

  async verify(): Promise<boolean> {
    if (!this.isConfigured) {
      return false
    }

    try {
      await this.transporter.verify()
      console.log("[v0] Email service verification successful")
      return true
    } catch (error: any) {
      console.error("[v0] Email service verification failed:", error.message)
      return false
    }
  }

  private isHTML(content: string): boolean {
    return /<[a-z][\s\S]*>/i.test(content)
  }

  private convertToHTML(content: string): string {
    if (this.isHTML(content)) {
      return content
    }

    // Convert plain text to HTML with basic formatting
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
            .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Notification</h2>
          </div>
          <div class="content">
            ${content.replace(/\n/g, "<br>")}
          </div>
          <div class="footer">
            <p>Sent via Notifications Hub</p>
          </div>
        </body>
      </html>
    `
  }

  private stripHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  getStatus(): { configured: boolean; host?: string; user?: string } {
    return {
      configured: this.isConfigured,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
    }
  }

  async close(): Promise<void> {
    if (this.transporter && this.isConfigured) {
      this.transporter.close()
      console.log("[v0] Email service connections closed")
    }
  }
}

export const EmailTemplates = {
  welcome: {
    subject: "Welcome to {{appName}}!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to {{appName}}!</h1>
          </div>
          <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>Thank you for joining {{appName}}. We're excited to have you on board!</p>
            <p>You can now receive notifications across multiple channels including email, SMS, push notifications, and more.</p>
            <a href="{{dashboardUrl}}" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
          </div>
        </body>
      </html>
    `,
  },
  notification: {
    subject: "{{subject}}",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
            .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>{{subject}}</h2>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>Sent via Notifications Hub</p>
          </div>
        </body>
      </html>
    `,
  },
}
