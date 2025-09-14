import { NotificationModel, NotificationLogModel, type Notification } from "../database/models/Notification"
import type { NotificationRequest, NotificationStatus } from "../types/notification"
import { NotificationQueueProcessor } from "./NotificationQueueProcessor"

export class NotificationService {
  private queueProcessor: NotificationQueueProcessor

  constructor() {
    this.queueProcessor = new NotificationQueueProcessor()
  }

  async sendNotification(request: NotificationRequest): Promise<NotificationStatus> {
    const notifications: Notification[] = []

    for (const channel of request.channels) {
      const notification = await NotificationModel.create({
        user_id: request.userId ? Number.parseInt(request.userId) : undefined,
        channel: channel.type,
        recipient: channel.recipient,
        subject: request.subject,
        content: request.message,
        status: "pending",
        scheduled_at: request.scheduledAt || new Date(),
        max_retries: 3,
        priority: request.priority || "normal",
      })

      notifications.push(notification)

      // Log the creation
      await NotificationLogModel.create({
        notification_id: notification.id!,
        status: "created",
        message: "Notification created and queued",
      })

      await this.queueProcessor.queueNotification({
        notificationId: notification.id!,
        channel: channel.type,
        recipient: channel.recipient,
        subject: request.subject,
        content: request.message,
        userId: notification.user_id,
        priority: request.priority || "normal",
        metadata: request.metadata,
      })
    }

    const notificationStatus: NotificationStatus = {
      id: notifications[0].id!.toString(),
      userId: request.userId,
      status: "queued",
      channels: notifications.map((notif) => ({
        type: notif.channel,
        status: "queued",
      })),
      createdAt: notifications[0].created_at!,
      updatedAt: notifications[0].updated_at!,
      scheduledAt: request.scheduledAt,
      retryCount: 0,
    }

    console.log(`[v0] Created and queued ${notifications.length} notifications`)
    return notificationStatus
  }

  async getNotificationStatus(id: string): Promise<NotificationStatus | null> {
    const notification = await NotificationModel.findById(Number.parseInt(id))
    if (!notification) return null

    return {
      id: notification.id!.toString(),
      userId: notification.user_id?.toString(),
      status: notification.status as any,
      channels: [
        {
          type: notification.channel,
          status: notification.status as any,
        },
      ],
      createdAt: notification.created_at!,
      updatedAt: notification.updated_at!,
      scheduledAt: notification.scheduled_at,
      retryCount: notification.retry_count || 0,
    }
  }

  async getUserNotifications(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    const notifications = await NotificationModel.list(limit, offset)

    // Filter by user if userId provided
    const userNotifications = userId ? notifications.filter((n) => n.user_id?.toString() === userId) : notifications

    const total = userNotifications.length // This is approximate, in production you'd want a separate count query

    return {
      notifications: userNotifications.map((n) => ({
        id: n.id!.toString(),
        userId: n.user_id?.toString(),
        status: n.status,
        channels: [
          {
            type: n.channel,
            status: n.status,
          },
        ],
        createdAt: n.created_at!,
        updatedAt: n.updated_at!,
        scheduledAt: n.scheduled_at,
        retryCount: n.retry_count || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async retryNotification(id: string): Promise<void> {
    const notificationId = Number.parseInt(id)
    const notification = await NotificationModel.findById(notificationId)

    if (!notification) {
      throw new Error("Notification not found")
    }

    await this.queueProcessor.queueNotification({
      notificationId: notification.id!,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject,
      content: notification.content,
      userId: notification.user_id,
      priority: notification.priority || "normal",
    })

    // Log the retry
    await NotificationLogModel.create({
      notification_id: notificationId,
      status: "retry_queued",
      message: "Notification manually queued for retry",
    })

    console.log(`[v0] Manually queued notification ${id} for retry`)
  }

  async getNotificationStats(): Promise<Record<string, number>> {
    return await NotificationModel.getNotificationStats()
  }

  async getPendingNotifications(limit = 100): Promise<Notification[]> {
    return await NotificationModel.getPendingNotifications(limit)
  }

  async getFailedNotifications(limit = 100): Promise<Notification[]> {
    return await NotificationModel.getFailedNotifications(limit)
  }

  // Queue management methods
  async getQueueStats() {
    return await this.queueProcessor.getQueueStats()
  }

  async pauseQueue(): Promise<void> {
    await this.queueProcessor.pauseQueue()
  }

  async resumeQueue(): Promise<void> {
    await this.queueProcessor.resumeQueue()
  }

  async clearFailedJobs(): Promise<void> {
    await this.queueProcessor.clearFailedJobs()
  }

  async retryAllFailedJobs(): Promise<void> {
    await this.queueProcessor.retryFailedJobs()
  }

  async getSystemHealth() {
    return await this.queueProcessor.healthCheck()
  }
}
