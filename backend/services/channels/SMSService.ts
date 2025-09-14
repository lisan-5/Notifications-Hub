import twilio from "twilio"

export interface SMSOptions {
  to: string
  message: string
  from?: string
  mediaUrl?: string[]
  statusCallback?: string
  maxPrice?: string
  provideFeedback?: boolean
}

export interface SMSResult {
  success: boolean
  messageId?: string
  status?: string
  error?: string
  cost?: string
}

export class SMSService {
  private client: twilio.Twilio | null = null
  private isConfigured = false
  private fromNumber: string

  constructor() {
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ""
    this.initializeClient()
  }

  private initializeClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn("[v0] Twilio credentials not configured. SMS service will be disabled.")
      this.isConfigured = false
      return
    }

    try {
      this.client = twilio(accountSid, authToken)
      this.isConfigured = true
      console.log("[v0] SMS service initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize SMS service:", error)
      this.isConfigured = false
    }
  }

  async send(to: string, message: string, metadata?: Record<string, any>): Promise<SMSResult> {
    if (!this.isConfigured || !this.client) {
      throw new Error("SMS service is not configured. Please check Twilio settings.")
    }

    const options: SMSOptions = {
      to: this.formatPhoneNumber(to),
      message,
      from: this.fromNumber,
      ...metadata,
    }

    return this.sendSMS(options)
  }

  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    if (!this.isConfigured || !this.client) {
      throw new Error("SMS service is not configured. Please check Twilio settings.")
    }

    try {
      const messageOptions: any = {
        body: options.message,
        from: options.from || this.fromNumber,
        to: options.to,
      }

      // Add optional parameters
      if (options.mediaUrl && options.mediaUrl.length > 0) {
        messageOptions.mediaUrl = options.mediaUrl
      }

      if (options.statusCallback) {
        messageOptions.statusCallback = options.statusCallback
      }

      if (options.maxPrice) {
        messageOptions.maxPrice = options.maxPrice
      }

      if (options.provideFeedback) {
        messageOptions.provideFeedback = options.provideFeedback
      }

      const message = await this.client.messages.create(messageOptions)

      console.log(`[v0] SMS sent successfully to ${options.to}: ${message.sid}`)

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to send SMS to ${options.to}:`, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async sendBulk(messages: SMSOptions[]): Promise<SMSResult[]> {
    if (!this.isConfigured || !this.client) {
      throw new Error("SMS service is not configured. Please check Twilio settings.")
    }

    const results: SMSResult[] = []

    for (const smsOptions of messages) {
      try {
        const result = await this.sendSMS(smsOptions)
        results.push(result)
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
        })
      }
    }

    return results
  }

  async getMessageStatus(messageId: string): Promise<{ status: string; errorCode?: string; errorMessage?: string }> {
    if (!this.isConfigured || !this.client) {
      throw new Error("SMS service is not configured. Please check Twilio settings.")
    }

    try {
      const message = await this.client.messages(messageId).fetch()
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      }
    } catch (error: any) {
      throw new Error(`Failed to get message status: ${error.message}`)
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "")

    // Add country code if missing (assuming US +1)
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    }

    // Add + if missing
    if (cleaned.length > 10 && !phoneNumber.startsWith("+")) {
      return `+${cleaned}`
    }

    return phoneNumber
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, "")
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  async verify(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false
    }

    try {
      // Try to fetch account info to verify credentials
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
      console.log("[v0] SMS service verification successful")
      return true
    } catch (error: any) {
      console.error("[v0] SMS service verification failed:", error.message)
      return false
    }
  }

  getStatus(): { configured: boolean; fromNumber?: string; accountSid?: string } {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    }
  }
}
