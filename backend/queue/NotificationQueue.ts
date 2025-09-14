import { Queue, Worker, type Job } from "bullmq"
import { redis } from "./connection"
import { NotificationModel, NotificationLogModel } from "../database/models/Notification"
import { EmailService } from "../services/channels/EmailService"
import { SMSService } from "../services/channels/SMSService"
import { PushService } from "../services/channels/PushService"
import { SlackService } from "../services/channels/SlackService"
import { TelegramService } from "../services/channels/TelegramService"

export interface NotificationJobData {
  notificationId: number
  channel: string
  recipient: string
  subject?: string
  content: string
  metadata?: Record<string, any>
}

// Create notification queue
export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
})

// Initialize channel services
const emailService = new EmailService()
const smsService = new SMSService()
const pushService = new PushService()
const slackService = new SlackService()
const telegramService = new TelegramService()

// Process notification jobs
export const notificationWorker = new Worker(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { notificationId, channel, recipient, subject, content, metadata } = job.data

    console.log(`[v0] Processing notification ${notificationId} for channel ${channel}`)

    try {
      // Update status to processing
      await NotificationModel.updateStatus(notificationId, "processing")
      await NotificationLogModel.create({
        notification_id: notificationId,
        status: "processing",
        message: `Started processing ${channel} notification`,
        metadata: { jobId: job.id, attempt: job.attemptsMade + 1 },
      })

      let result: any

      // Route to appropriate service based on channel
      switch (channel.toLowerCase()) {
        case "email":
          result = await emailService.send(recipient, subject || "", content, metadata)
          break
        case "sms":
          result = await smsService.send(recipient, content, metadata)
          break
        case "push":
          result = await pushService.send(recipient, subject || "", content, metadata)
          break
        case "slack":
          result = await slackService.send(recipient, content, metadata)
          break
        case "telegram":
          result = await telegramService.send(recipient, content, metadata)
          break
        default:
          throw new Error(`Unsupported notification channel: ${channel}`)
      }

      // Update status to sent
      await NotificationModel.updateStatus(notificationId, "sent", undefined, new Date())
      await NotificationLogModel.create({
        notification_id: notificationId,
        status: "sent",
        message: `Successfully sent ${channel} notification`,
        metadata: { result, jobId: job.id },
      })

      console.log(`[v0] Successfully sent notification ${notificationId} via ${channel}`)
      return result
    } catch (error: any) {
      console.error(`[v0] Failed to send notification ${notificationId}:`, error.message)

      // Log the error
      await NotificationLogModel.create({
        notification_id: notificationId,
        status: "error",
        message: error.message,
        metadata: {
          error: error.stack,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
        },
      })

      // If this is the final attempt, mark as failed
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await NotificationModel.updateStatus(notificationId, "failed", error.message)
        await NotificationLogModel.create({
          notification_id: notificationId,
          status: "failed",
          message: `Failed after ${job.attemptsMade + 1} attempts`,
          metadata: { finalError: error.message, jobId: job.id },
        })
      } else {
        // Mark as retrying for next attempt
        await NotificationModel.updateStatus(notificationId, "retrying", error.message)
        await NotificationModel.incrementRetryCount(notificationId)
      }

      throw error // Re-throw to trigger BullMQ retry logic
    }
  },
  {
    connection: redis,
    concurrency: 10, // Process up to 10 jobs concurrently
  },
)

// Queue management functions
export class NotificationQueueManager {
  static async addNotification(data: NotificationJobData, delay?: number): Promise<Job<NotificationJobData>> {
    const jobOptions: any = {}

    if (delay) {
      jobOptions.delay = delay
    }

    const job = await notificationQueue.add("send-notification", data, jobOptions)

    console.log(`[v0] Queued notification ${data.notificationId} for ${data.channel} (Job ID: ${job.id})`)
    return job
  }

  static async addBulkNotifications(notifications: NotificationJobData[]): Promise<Job<NotificationJobData>[]> {
    const jobs = notifications.map((data) => ({
      name: "send-notification",
      data,
    }))

    const addedJobs = await notificationQueue.addBulk(jobs)
    console.log(`[v0] Queued ${addedJobs.length} bulk notifications`)
    return addedJobs
  }

  static async getQueueStats() {
    const waiting = await notificationQueue.getWaiting()
    const active = await notificationQueue.getActive()
    const completed = await notificationQueue.getCompleted()
    const failed = await notificationQueue.getFailed()

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    }
  }

  static async retryFailedJobs(): Promise<void> {
    const failedJobs = await notificationQueue.getFailed()

    for (const job of failedJobs) {
      await job.retry()
      console.log(`[v0] Retried failed job ${job.id}`)
    }
  }

  static async cleanQueue(): Promise<void> {
    // Clean old completed and failed jobs
    await notificationQueue.clean(24 * 60 * 60 * 1000, 100, "completed") // Keep completed jobs for 24 hours
    await notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 50, "failed") // Keep failed jobs for 7 days

    console.log("[v0] Queue cleaned successfully")
  }
}

// Error handling for worker
notificationWorker.on("completed", (job) => {
  console.log(`[v0] Job ${job.id} completed successfully`)
})

notificationWorker.on("failed", (job, err) => {
  console.error(`[v0] Job ${job?.id} failed:`, err.message)
})

notificationWorker.on("error", (err) => {
  console.error("[v0] Worker error:", err)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  await notificationWorker.close()
  await notificationQueue.close()
})

process.on("SIGINT", async () => {
  await notificationWorker.close()
  await notificationQueue.close()
})
