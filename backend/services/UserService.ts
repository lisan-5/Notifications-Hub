import { UserModel, type NotificationUser } from "../database/models/User"
import type { User } from "../types/notification"

export class UserService {
  async createOrUpdateUser(userData: Partial<User>): Promise<User> {
    let dbUser: NotificationUser

    if (userData.email) {
      const existingUser = await UserModel.findByEmail(userData.email)

      if (existingUser) {
        // Update existing user
        dbUser =
          (await UserModel.update(existingUser.id!, {
            name: userData.name,
            phone: userData.phone,
            push_token: userData.pushTokens?.[0], // Store first push token
            slack_webhook_url: userData.slackUserId, // Repurpose for webhook URL
            telegram_chat_id: userData.telegramChatId,
            preferences: userData.preferences,
          })) || existingUser
      } else {
        // Create new user
        dbUser = await UserModel.create({
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          push_token: userData.pushTokens?.[0],
          slack_webhook_url: userData.slackUserId,
          telegram_chat_id: userData.telegramChatId,
          preferences: userData.preferences || {
            email: true,
            sms: true,
            push: true,
            slack: true,
            telegram: true,
          },
        })
      }
    } else {
      throw new Error("Email is required")
    }

    const user: User = {
      id: dbUser.id!.toString(),
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      pushTokens: dbUser.push_token ? [dbUser.push_token] : [],
      slackUserId: dbUser.slack_webhook_url,
      telegramChatId: dbUser.telegram_chat_id,
      preferences: dbUser.preferences || {
        email: true,
        sms: true,
        push: true,
        slack: true,
        telegram: true,
      },
      createdAt: dbUser.created_at!,
      updatedAt: dbUser.updated_at!,
    }

    console.log("Created/updated user in database:", user.email)
    return user
  }

  async getUser(id: string): Promise<User | null> {
    const dbUser = await UserModel.findById(Number.parseInt(id))
    if (!dbUser) return null

    return {
      id: dbUser.id!.toString(),
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      pushTokens: dbUser.push_token ? [dbUser.push_token] : [],
      slackUserId: dbUser.slack_webhook_url,
      telegramChatId: dbUser.telegram_chat_id,
      preferences: dbUser.preferences || {
        email: true,
        sms: true,
        push: true,
        slack: true,
        telegram: true,
      },
      createdAt: dbUser.created_at!,
      updatedAt: dbUser.updated_at!,
    }
  }

  async updateUserPreferences(id: string, preferences: Partial<User["preferences"]>): Promise<User | null> {
    const userId = Number.parseInt(id)
    const existingUser = await UserModel.findById(userId)
    if (!existingUser) return null

    const updatedPreferences = { ...existingUser.preferences, ...preferences }
    const dbUser = await UserModel.update(userId, { preferences: updatedPreferences })

    if (!dbUser) return null

    return {
      id: dbUser.id!.toString(),
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      pushTokens: dbUser.push_token ? [dbUser.push_token] : [],
      slackUserId: dbUser.slack_webhook_url,
      telegramChatId: dbUser.telegram_chat_id,
      preferences: dbUser.preferences || {
        email: true,
        sms: true,
        push: true,
        slack: true,
        telegram: true,
      },
      createdAt: dbUser.created_at!,
      updatedAt: dbUser.updated_at!,
    }
  }

  async listUsers(limit = 50, offset = 0): Promise<User[]> {
    const dbUsers = await UserModel.list(limit, offset)

    return dbUsers.map((dbUser) => ({
      id: dbUser.id!.toString(),
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      pushTokens: dbUser.push_token ? [dbUser.push_token] : [],
      slackUserId: dbUser.slack_webhook_url,
      telegramChatId: dbUser.telegram_chat_id,
      preferences: dbUser.preferences || {
        email: true,
        sms: true,
        push: true,
        slack: true,
        telegram: true,
      },
      createdAt: dbUser.created_at!,
      updatedAt: dbUser.updated_at!,
    }))
  }
}
