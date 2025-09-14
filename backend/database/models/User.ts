import { sql } from "../connection"

export interface NotificationUser {
  id?: number
  email: string
  name?: string
  phone?: string
  push_token?: string
  slack_webhook_url?: string
  telegram_chat_id?: string
  preferences?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}

export class UserModel {
  static async create(user: Omit<NotificationUser, "id" | "created_at" | "updated_at">): Promise<NotificationUser> {
    const result = await sql`
      INSERT INTO notification_users (email, name, phone, push_token, slack_webhook_url, telegram_chat_id, preferences)
      VALUES (${user.email}, ${user.name || null}, ${user.phone || null}, ${user.push_token || null}, 
              ${user.slack_webhook_url || null}, ${user.telegram_chat_id || null}, ${JSON.stringify(user.preferences || {})})
      RETURNING *
    `
    return result[0] as NotificationUser
  }

  static async findByEmail(email: string): Promise<NotificationUser | null> {
    const result = await sql`
      SELECT * FROM notification_users WHERE email = ${email}
    `
    return (result[0] as NotificationUser) || null
  }

  static async findById(id: number): Promise<NotificationUser | null> {
    const result = await sql`
      SELECT * FROM notification_users WHERE id = ${id}
    `
    return (result[0] as NotificationUser) || null
  }

  static async update(id: number, updates: Partial<NotificationUser>): Promise<NotificationUser | null> {
    const setClause = Object.keys(updates)
      .filter((key) => key !== "id" && updates[key as keyof NotificationUser] !== undefined)
      .map((key) => `${key} = $${key}`)
      .join(", ")

    if (!setClause) return null

    const result = await sql`
      UPDATE notification_users 
      SET ${sql.unsafe(setClause)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return (result[0] as NotificationUser) || null
  }

  static async list(limit = 50, offset = 0): Promise<NotificationUser[]> {
    const result = await sql`
      SELECT * FROM notification_users 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `
    return result as NotificationUser[]
  }
}
