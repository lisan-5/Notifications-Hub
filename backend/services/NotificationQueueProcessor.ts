import { Queue, Worker, type Job } from "bullmq"
import { Redis } from "ioredis"
import { NotificationModel, NotificationLogModel } from "../database/models/Notification"
import { EmailService } from "./channels/EmailService"
import { SMSService } from "./channels/SMSService"
import { PushService } from "./channels/PushService"
import { SlackService } from "./channels/SlackService"
import { TelegramService } from "./channels/TelegramService"

export interface NotificationJob {
  notificationId: number
  channel: string
  recipient: string
  subject: string
  content: string
  userId?: number
  priority: string
  metadata?: Record<string, any>
}

export interface RetryConfig {
  maxRetries: number
  backoffType: "exponential" | "fixed"
  backoffDelay: number
  maxBackoffDelay?: number
}

export class NotificationQueueProcessor {
  private queue: Queue
  private worker: Worker
  private redis: Redis
  private emailService: EmailService
  private smsService: SMSService
  private pushService: PushService
  private slackService: SlackService
  private telegramService: TelegramService

  private retryConfigs: Record<string, RetryConfig> = {
    email: {
      maxRetries: 5,
      backoffType: "exponential",
      backoffDelay: 2000, // 2 seconds
      maxBackoffDelay: 300000, // 5 minutes
    },
    sms: {
      maxRetries: 3,
      backoffType: "exponential",
      backoffDelay: 5000, // 5 seconds
      maxBackoffDelay: 600000, // 10 minutes
    },
    push: {
      maxRetries: 4,
      backoffType: "exponential",
      backoffDelay: 1000, // 1 second
      maxBackoffDelay: 120000, // 2 minutes
    },
    slack: {
      maxRetries: 3,
      backoffType: "fixed",
      backoffDelay: 10000, // 10 seconds
    },
    telegram: {
      maxRetries: 3,
      backoffType: "fixed",
      backoffDelay: 10000, // 10 seconds
    },
  }

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number.parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    })

    // Initialize notification services
    this.emailService = new EmailService()
    this.smsService = new SMSService()
    this.pushService = new PushService()
    this.slackService = new SlackService()
    this.telegramService = new TelegramService()

    // Initialize queue with advanced configuration
    this.queue = new Queue("notifications", {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 1, // We handle retries manually for better control
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    })

    // Initialize worker with comprehensive error handling
    this.worker = new Worker(
      "notifications",
      async (job: Job<NotificationJob>) => {
        return this.processNotification(job)
      },
      {
        connection: this.redis,
        concurrency: 10, // Process up to 10 jobs concurrently
        limiter: {
          max: 100, // Max 100 jobs per duration
          duration: 60000, // 1 minute
        },
      },
    )

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.worker.on("completed", async (job: Job<NotificationJob>) => {
      console.log(`[v0] Job ${job.id} completed successfully`)
      await this.updateNotificationStatus(job.data.notificationId, "sent", "Notification sent successfully")
    })

    this.worker.on("failed", async (job: Job<NotificationJob> | undefined, err: Error) => {
      if (!job) return

      console.error(`[v0] Job ${job.id} failed:`, err.message)

      const notification = await NotificationModel.findById(job.data.notificationId)
      if (!notification) return

      const retryConfig = this.retryConfigs[job.data.channel]
      const currentRetries = notification.retry_count || 0

      if (currentRetries < retryConfig.maxRetries) {
        // Schedule retry
        await this.scheduleRetry(job.data, currentRetries + 1, err.message)
      } else {
        // Mark as permanently failed
        await this.updateNotificationStatus(
          job.data.notificationId,
          "failed",
          `Max retries (${retryConfig.maxRetries}) exceeded. Last error: ${err.message}`,
        )
      }
    })

    this.worker.on("stalled", async (jobId: string) => {
      console.warn(`[v0] Job ${jobId} stalled`)
      // Handle stalled jobs - could be due to worker crashes
    })

    this.queue.on("error", (err) => {
      console.error("[v0] Queue error:", err)
    })

    this.worker.on("error", (err) => {
      console.error("[v0] Worker error:", err)
    })
  }

  private async processNotification(job: Job<NotificationJob>): Promise<void> {
    const { notificationId, channel, recipient, subject, content, metadata } = job.data

    try {
      // Update status to processing
      await this.updateNotificationStatus(notificationId, "processing", "Processing notification")

      let result: any

      // Route to appropriate service based on channel
      switch (channel.toLowerCase()) {
        case "email":
          result = await this.emailService.send(recipient, subject, content, metadata)
          break
        case "sms":
          result = await this.smsService.send(recipient, content, metadata)
          break
        case "push":
          result = await this.pushService.send(recipient, subject, content, metadata)
          break
        case "slack":
          result = await this.slackService.send(recipient, subject, content, metadata)
          break
        case "telegram":
          result = await this.telegramService.send(recipient, subject, content, metadata)
          break
        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }

      // Log successful delivery with provider response
      await NotificationLogModel.create({
        notification_id: notificationId,
        status: "delivered",
        message: `Successfully delivered via ${channel}`,
        provider_response: JSON.stringify(result),
      })

      console.log(`[v0] Notification ${notificationId} sent successfully via ${channel}`)
    } catch (error: any) {
      // Log the error with details
      await NotificationLogModel.create({
        notification_id: notificationId,
        status: "error",
        message: `Failed to send via ${channel}: ${error.message}`,
        error_details: JSON.stringify({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }),
      })

      throw error // Re-throw to trigger retry logic
    }
  }

  private async scheduleRetry(jobData: NotificationJob, retryCount: number, errorMessage: string): Promise<void> {
    const retryConfig = this.retryConfigs[jobData.channel]

    // Calculate delay based on backoff strategy
    let delay: number
    if (retryConfig.backoffType === "exponential") {
      delay = Math.min(
        retryConfig.backoffDelay * Math.pow(2, retryCount - 1),
        retryConfig.maxBackoffDelay || retryConfig.backoffDelay * 10,
      )
    } else {
      delay = retryConfig.backoffDelay
    }

    // Update retry count in database
    await NotificationModel.incrementRetryCount(jobData.notificationId)

    // Log retry scheduling
    await NotificationLogModel.create({
      notification_id: jobData.notificationId,
      status: "retry_scheduled",
      message: `Retry ${retryCount}/${retryConfig.maxRetries} scheduled in ${delay}ms. Previous error: ${errorMessage}`,
    })

    // Schedule the retry job
    await this.queue.add(`notification-retry-${jobData.notificationId}`, jobData, {
      delay,
      priority: this.getPriority(jobData.priority),
      jobId: `retry-${jobData.notificationId}-${retryCount}`,
    })

    console.log(`[v0] Scheduled retry ${retryCount} for notification ${jobData.notificationId} in ${delay}ms`)
  }

  private async updateNotificationStatus(
    notificationId: number,
    status: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await NotificationModel.updateStatus(notificationId, status)

      await NotificationLogModel.create({
        notification_id: notificationId,
        status,
        message,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      })

      // Update last processed timestamp
      await NotificationModel.updateLastProcessed(notificationId)
    } catch (error: any) {
      console.error(`[v0] Failed to update notification status:`, error.message)
    }
  }

  private getPriority(priority: string): number {
    const priorityMap: Record<string, number> = {
      urgent: 10,
      high: 5,
      normal: 0,
      low: -5,
    }
    return priorityMap[priority.toLowerCase()] || 0
  }

  async queueNotification(jobData: NotificationJob): Promise<string> {
    const job = await this.queue.add(`notification-${jobData.notificationId}`, jobData, {
      priority: this.getPriority(jobData.priority),
      jobId: `notification-${jobData.notificationId}`,
    })

    await this.updateNotificationStatus(jobData.notificationId, "queued", "Notification queued for processing")

    console.log(`[v0] Queued notification ${jobData.notificationId} with job ID ${job.id}`)
    return job.id!
  }

  async queueBulkNotifications(jobsData: NotificationJob[]): Promise<string[]> {
    const jobs = jobsData.map((jobData) => ({
      name: `notification-${jobData.notificationId}`,
      data: jobData,
      opts: {
        priority: this.getPriority(jobData.priority),
        jobId: `notification-${jobData.notificationId}`,
      },
    }))

    const queuedJobs = await this.queue.addBulk(jobs)

    // Update all notifications to queued status
    for (const jobData of jobsData) {
      await this.updateNotificationStatus(jobData.notificationId, "queued", "Notification queued for processing")
    }

    console.log(`[v0] Queued ${queuedJobs.length} notifications in bulk`)
    return queuedJobs.map((job) => job.id!)
  }

  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    }
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause()
    console.log("[v0] Queue paused")
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume()
    console.log("[v0] Queue resumed")
  }

  async clearFailedJobs(): Promise<void> {
    await this.queue.clean(0, 0, "failed")
    console.log("[v0] Cleared failed jobs")
  }

  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.queue.getFailed()
    for (const job of failedJobs) {
      await job.retry()
    }
    console.log(`[v0] Retried ${failedJobs.length} failed jobs`)
  }

  async shutdown(): Promise<void> {
    console.log("[v0] Shutting down notification queue processor...")

    await this.worker.close()
    await this.queue.close()
    await this.redis.disconnect()

    console.log("[v0] Notification queue processor shut down successfully")
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const queueStats = await this.getQueueStats()
      const redisStatus = this.redis.status

      return {
        healthy: redisStatus === "ready",
        details: {
          redis: redisStatus,
          queue: queueStats,
          worker: {
            running: !this.worker.closing,
          },
        },
      }
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          error: error.message,
        },
      }
    }
  }
}
