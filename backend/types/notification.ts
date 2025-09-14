export interface NotificationRequest {
  userId: string
  channels: NotificationChannel[]
  message: {
    title: string
    body: string
    data?: Record<string, any>
  }
  priority: "low" | "normal" | "high" | "urgent"
  scheduledAt?: Date
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
}

export interface NotificationChannel {
  type: "email" | "sms" | "push" | "slack" | "telegram"
  config: Record<string, any>
}

export interface NotificationStatus {
  id: string
  userId: string
  status: "pending" | "sent" | "failed" | "retrying"
  channels: ChannelStatus[]
  createdAt: Date
  updatedAt: Date
  scheduledAt?: Date
  sentAt?: Date
  failureReason?: string
  retryCount: number
}

export interface ChannelStatus {
  type: NotificationChannel["type"]
  status: "pending" | "sent" | "failed"
  sentAt?: Date
  failureReason?: string
  messageId?: string
}

export interface User {
  id: string
  email?: string
  phone?: string
  pushTokens?: string[]
  slackUserId?: string
  telegramChatId?: string
  preferences: {
    email: boolean
    sms: boolean
    push: boolean
    slack: boolean
    telegram: boolean
  }
  createdAt: Date
  updatedAt: Date
}
