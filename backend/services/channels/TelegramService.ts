export class TelegramService {
  private botToken: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ""

    if (!this.botToken) {
      console.warn("[v0] Telegram bot token not configured, Telegram service disabled")
    }
  }

  async send(chatId: string, content: string, metadata?: Record<string, any>): Promise<any> {
    if (!this.botToken) {
      throw new Error("Telegram service not configured")
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
    const payload = {
      chat_id: chatId,
      text: content,
      parse_mode: "HTML",
      ...metadata,
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Telegram API error: ${result.description}`)
    }

    console.log(`[v0] Telegram message sent to ${chatId}: ${result.result.message_id}`)
    return result
  }
}
