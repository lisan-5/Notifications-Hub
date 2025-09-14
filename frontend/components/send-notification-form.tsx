"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

const SendIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const MessageSquareIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const SmartphoneIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z"
    />
  </svg>
)

const SlackIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const TelegramIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const channelIcons = {
  email: MailIcon,
  sms: MessageSquareIcon,
  push: SmartphoneIcon,
  slack: SlackIcon,
  telegram: TelegramIcon,
}

interface ChannelConfig {
  type: string
  recipient: string
}

export function SendNotificationForm() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    userId: "",
    title: "",
    body: "",
    priority: "normal",
    channels: [] as string[],
    scheduledAt: "",
    recipients: {
      email: "",
      sms: "",
      push: "",
      slack: "",
      telegram: "",
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleChannelToggle = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const handleRecipientChange = (channel: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [channel]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Prepare channels with recipients
      const channels: ChannelConfig[] = formData.channels
        .map((channel) => ({
          type: channel,
          recipient: formData.recipients[channel as keyof typeof formData.recipients] || "",
        }))
        .filter((channel) => channel.recipient.trim() !== "")

      if (channels.length === 0) {
        toast({
          title: "Error",
          description: "Please provide recipients for selected channels",
          variant: "destructive",
        })
        return
      }

      const payload = {
        userId: formData.userId || undefined,
        subject: formData.title,
        message: formData.body,
        channels,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
        priority: formData.priority,
      }

      console.log("[v0] Sending notification:", payload)

      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to send notification")
      }

      const result = await response.json()
      console.log("[v0] Notification sent successfully:", result)

      // Reset form
      setFormData({
        userId: "",
        title: "",
        body: "",
        priority: "normal",
        channels: [],
        scheduledAt: "",
        recipients: {
          email: "",
          sms: "",
          push: "",
          slack: "",
          telegram: "",
        },
      })

      toast({
        title: "Success",
        description: "Notification sent successfully!",
      })
    } catch (error: any) {
      console.error("[v0] Error sending notification:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const channels = [
    { id: "email", label: "Email", icon: MailIcon, placeholder: "user@example.com" },
    { id: "sms", label: "SMS", icon: MessageSquareIcon, placeholder: "+1234567890" },
    { id: "push", label: "Push", icon: SmartphoneIcon, placeholder: "device-token" },
    { id: "slack", label: "Slack", icon: SlackIcon, placeholder: "webhook-url" },
    { id: "telegram", label: "Telegram", icon: TelegramIcon, placeholder: "chat-id" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SendIcon />
          Send Notification
        </CardTitle>
        <CardDescription>Send notifications across multiple channels with a single request</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID (Optional)</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={(e) => setFormData((prev) => ({ ...prev, userId: e.target.value }))}
                placeholder="user-123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Notification title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Your notification message..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Channels & Recipients</Label>
            <div className="space-y-4">
              {channels.map((channel) => {
                const Icon = channel.icon
                const isSelected = formData.channels.includes(channel.id)

                return (
                  <div key={channel.id} className="space-y-2">
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"
                      }`}
                      onClick={() => handleChannelToggle(channel.id)}
                    >
                      <Checkbox checked={isSelected} onChange={() => handleChannelToggle(channel.id)} />
                      <Icon />
                      <span className="text-sm font-medium">{channel.label}</span>
                    </div>
                    {isSelected && (
                      <Input
                        placeholder={channel.placeholder}
                        value={formData.recipients[channel.id as keyof typeof formData.recipients]}
                        onChange={(e) => handleRecipientChange(channel.id, e.target.value)}
                        className="ml-6"
                        required
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {formData.channels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.channels.map((channel) => (
                  <Badge key={channel} variant="secondary">
                    {channels.find((c) => c.id === channel)?.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule (Optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
            />
          </div>

          <Button type="submit" disabled={isLoading || formData.channels.length === 0} className="w-full">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <SendIcon />
                <span className="ml-2">Send Notification</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
