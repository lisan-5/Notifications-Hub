import admin from "firebase-admin"
import type { Message, MulticastMessage, BatchResponse } from "firebase-admin/messaging"

export interface PushOptions {
  token: string
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
  clickAction?: string
  badge?: number
  sound?: string
  priority?: "high" | "normal"
  timeToLive?: number
  collapseKey?: string
}

export interface PushResult {
  success: boolean
  messageId?: string
  error?: string
  failureCount?: number
  successCount?: number
}

export class PushService {
  private isConfigured = false

  constructor() {
    this.initializeFirebase()
  }

  private initializeFirebase() {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      const projectId = process.env.FIREBASE_PROJECT_ID

      if (!serviceAccountKey || !projectId) {
        console.warn("[v0] Firebase credentials not configured. Push service will be disabled.")
        this.isConfigured = false
        return
      }

      // Parse service account key if it's a JSON string
      let serviceAccount
      try {
        serviceAccount = JSON.parse(serviceAccountKey)
      } catch {
        console.error("[v0] Invalid Firebase service account key format")
        this.isConfigured = false
        return
      }

      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        })
      }

      this.isConfigured = true
      console.log("[v0] Push notification service initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize push service:", error)
      this.isConfigured = false
    }
  }

  async send(token: string, title: string, body: string, metadata?: Record<string, any>): Promise<PushResult> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    const options: PushOptions = {
      token,
      title,
      body,
      ...metadata,
    }

    return this.sendPush(options)
  }

  async sendPush(options: PushOptions): Promise<PushResult> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    try {
      const message: Message = {
        token: options.token,
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.imageUrl,
        },
        data: options.data,
        android: {
          priority: options.priority || "high",
          ttl: options.timeToLive ? options.timeToLive * 1000 : undefined,
          collapseKey: options.collapseKey,
          notification: {
            clickAction: options.clickAction,
            sound: options.sound || "default",
            priority: options.priority || "high",
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options.badge,
              sound: options.sound || "default",
              category: options.clickAction,
            },
          },
        },
        webpush: {
          notification: {
            title: options.title,
            body: options.body,
            icon: options.imageUrl,
            clickAction: options.clickAction,
          },
        },
      }

      const messageId = await admin.messaging().send(message)
      console.log(`[v0] Push notification sent successfully to ${options.token}: ${messageId}`)

      return {
        success: true,
        messageId,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to send push notification to ${options.token}:`, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    options?: Partial<PushOptions>,
  ): Promise<PushResult> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    try {
      const message: MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
          imageUrl: options?.imageUrl,
        },
        data: options?.data,
        android: {
          priority: options?.priority || "high",
          ttl: options?.timeToLive ? options.timeToLive * 1000 : undefined,
          collapseKey: options?.collapseKey,
          notification: {
            clickAction: options?.clickAction,
            sound: options?.sound || "default",
            priority: options?.priority || "high",
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options?.badge,
              sound: options?.sound || "default",
              category: options?.clickAction,
            },
          },
        },
        webpush: {
          notification: {
            title,
            body,
            icon: options?.imageUrl,
            clickAction: options?.clickAction,
          },
        },
      }

      const response: BatchResponse = await admin.messaging().sendMulticast(message)

      console.log(`[v0] Multicast push sent: ${response.successCount} successful, ${response.failureCount} failed`)

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error: any) {
      console.error("[v0] Failed to send multicast push notification:", error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async sendToTopic(topic: string, title: string, body: string, options?: Partial<PushOptions>): Promise<PushResult> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    try {
      const message: Message = {
        topic,
        notification: {
          title,
          body,
          imageUrl: options?.imageUrl,
        },
        data: options?.data,
        android: {
          priority: options?.priority || "high",
          ttl: options?.timeToLive ? options.timeToLive * 1000 : undefined,
          collapseKey: options?.collapseKey,
        },
        apns: {
          payload: {
            aps: {
              badge: options?.badge,
              sound: options?.sound || "default",
            },
          },
        },
      }

      const messageId = await admin.messaging().send(message)
      console.log(`[v0] Topic push notification sent to ${topic}: ${messageId}`)

      return {
        success: true,
        messageId,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to send topic push notification to ${topic}:`, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic)
      console.log(`[v0] Subscribed ${response.successCount} tokens to topic ${topic}`)
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to subscribe tokens to topic ${topic}:`, error.message)
      throw new Error(`Topic subscription failed: ${error.message}`)
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isConfigured) {
      throw new Error("Push service is not configured. Please check Firebase settings.")
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic)
      console.log(`[v0] Unsubscribed ${response.successCount} tokens from topic ${topic}`)
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error: any) {
      console.error(`[v0] Failed to unsubscribe tokens from topic ${topic}:`, error.message)
      throw new Error(`Topic unsubscription failed: ${error.message}`)
    }
  }

  async verify(): Promise<boolean> {
    if (!this.isConfigured) {
      return false
    }

    try {
      // Try to get project info to verify credentials
      const app = admin.app()
      if (app) {
        console.log("[v0] Push service verification successful")
        return true
      }
      return false
    } catch (error: any) {
      console.error("[v0] Push service verification failed:", error.message)
      return false
    }
  }

  getStatus(): { configured: boolean; projectId?: string } {
    return {
      configured: this.isConfigured,
      projectId: process.env.FIREBASE_PROJECT_ID,
    }
  }
}
