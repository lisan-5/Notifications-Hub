import { query } from "../connection"

export interface Notification {
  id?: number
  user_id?: number
  channel: string
  recipient: string
  subject: string
  content: string
  status: string
  scheduled_at?: Date
  sent_at?: Date
  created_at?: Date
  updated_at?: Date
  retry_count?: number
  max_retries?: number
  priority?: string
  last_processed_at?: Date
}

export interface NotificationLog {
  id?: number
  notification_id: number
  status: string
  message: string
  error_details?: string
  provider_response?: string
  metadata?: string
  created_at?: Date
}

export class NotificationModel {
  static async create(notification: Omit<Notification, "id" | "created_at" | "updated_at">): Promise<Notification> {
    const result = await query(
      `INSERT INTO notifications (user_id, channel, recipient, subject, content, status, max_retries, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        notification.user_id || null,
        notification.channel,
        notification.recipient,
        notification.subject || null,
        notification.content,
        notification.status || "pending",
        notification.max_retries || 3,
        notification.scheduled_at || new Date(),
      ],
    )
    return result.rows[0] as Notification
  }

  static async findById(id: number): Promise<Notification | null> {
    const result = await query(`SELECT * FROM notifications WHERE id = $1`, [id])
    return (result.rows[0] as Notification) || null
  }

  static async updateStatus(id: number, status: string): Promise<void> {
    const sentAt = status === "sent" ? new Date() : null
    await query(
      `UPDATE notifications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP, sent_at = $2
       WHERE id = $3`,
      [status, sentAt, id],
    )
  }

  static async updateLastProcessed(id: number): Promise<void> {
    await query(
      `UPDATE notifications 
       SET last_processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id],
    )
  }

  static async incrementRetryCount(id: number): Promise<void> {
    await query(
      `UPDATE notifications 
       SET retry_count = COALESCE(retry_count, 0) + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id],
    )
  }

  static async getPendingNotifications(limit = 100): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'pending' AND scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY scheduled_at ASC
       LIMIT $1`,
      [limit],
    )
    return result.rows as Notification[]
  }

  static async getFailedNotifications(limit = 100): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'failed' AND COALESCE(retry_count, 0) < COALESCE(max_retries, 3)
       ORDER BY updated_at ASC
       LIMIT $1`,
      [limit],
    )
    return result.rows as Notification[]
  }

  static async getNotificationsByStatus(status: string, limit = 100, offset = 0): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    )
    return result.rows
  }

  static async getNotificationStats(): Promise<Record<string, number>> {
    const result = await query(`
      SELECT 
        status,
        channel,
        COUNT(*) as count,
        AVG(retry_count) as avg_retries
      FROM notifications 
      WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
      GROUP BY status, channel
    `)

    const stats: Record<string, number> = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      queued: 0,
    }

    for (const row of result.rows) {
      stats[row.status] = (stats[row.status] || 0) + Number.parseInt(row.count)
      stats.total += Number.parseInt(row.count)
    }

    return stats
  }

  static async getStaleNotifications(minutesStale = 30): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'processing' 
       AND last_processed_at < CURRENT_TIMESTAMP - INTERVAL '${minutesStale} minutes'
       ORDER BY last_processed_at ASC`,
    )
    return result.rows
  }

  static async getRetryableNotifications(): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'failed' 
       AND COALESCE(retry_count, 0) < COALESCE(max_retries, 3)
       AND scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY priority DESC, created_at ASC
       LIMIT 100`,
    )
    return result.rows
  }

  static async list(limit = 50, offset = 0, status?: string): Promise<Notification[]> {
    let queryStr = `
      SELECT n.*, u.email as user_email, u.name as user_name
      FROM notifications n
      LEFT JOIN notification_users u ON n.user_id = u.id
    `

    if (status) {
      queryStr += `
        WHERE n.status = $1
      `
    }

    const result = await query(
      `${queryStr}
      ORDER BY n.created_at DESC 
      LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    )

    return result.rows as Notification[]
  }
}

export class NotificationLogModel {
  static async create(log: Omit<NotificationLog, "id" | "created_at">): Promise<NotificationLog> {
    const result = await query(
      `INSERT INTO notification_logs 
       (notification_id, status, message, error_details, provider_response, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [log.notification_id, log.status, log.message, log.error_details, log.provider_response, log.metadata],
    )
    return result.rows[0]
  }

  static async getByNotificationId(notificationId: number): Promise<NotificationLog[]> {
    const result = await query(
      `SELECT * FROM notification_logs 
       WHERE notification_id = $1 
       ORDER BY created_at DESC`,
      [notificationId],
    )
    return result.rows
  }

  static async getRecentLogs(limit = 100): Promise<NotificationLog[]> {
    const result = await query(
      `SELECT nl.*, n.channel, n.recipient 
       FROM notification_logs nl
       JOIN notifications n ON nl.notification_id = n.id
       ORDER BY nl.created_at DESC 
       LIMIT $1`,
      [limit],
    )
    return result.rows
  }

  static async getErrorLogs(limit = 50): Promise<NotificationLog[]> {
    const result = await query(
      `SELECT nl.*, n.channel, n.recipient 
       FROM notification_logs nl
       JOIN notifications n ON nl.notification_id = n.id
       WHERE nl.status IN ('error', 'failed')
       ORDER BY nl.created_at DESC 
       LIMIT $1`,
      [limit],
    )
    return result.rows
  }
}
