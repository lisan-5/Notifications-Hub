export class SlackService {
  async send(webhookUrl: string, content: string, metadata?: Record<string, any>): Promise<any> {
    const payload = {
      text: content,
      ...metadata,
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`)
    }

    console.log(`[v0] Slack message sent to webhook: ${webhookUrl}`)
    return { success: true, status: response.status }
  }
}
