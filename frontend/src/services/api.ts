import axios from "axios"

const API_BASE_URL = "http://localhost:3001/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

export const ApiService = {
  async checkHealth() {
    const response = await api.get("/health")
    return response.data
  },

  async getNotifications() {
    const response = await api.get("/notifications")
    return response.data
  },

  async sendNotification(notification: {
    title: string
    message: string
    type: string
    recipients: string[]
  }) {
    const response = await api.post("/notifications/send", notification)
    return response.data
  },

  async getAnalytics() {
    const response = await api.get("/analytics")
    return response.data
  },

  async getUsers() {
    const response = await api.get("/users")
    return response.data
  },
}
