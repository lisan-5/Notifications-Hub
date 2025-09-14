"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SendNotificationForm } from "./send-notification-form"
import { NotificationsList } from "./notifications-list"
import { UsersManagement } from "./users-management"
import { AnalyticsDashboard } from "./analytics-dashboard"

const BellIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-5 5v-5zM4.868 19.718A2 2 0 003 18V6a2 2 0 011.732-1.99l8-1.333A2 2 0 0115 4.667V18a2 2 0 01-1.732 1.99l-8 1.333z"
    />
  </svg>
)

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
)

const BarChartIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
)

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const AlertIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
)

interface DashboardStats {
  totalSent: number
  successRate: number
  activeUsers: number
  failed: number
  pending: number
}

interface ApiStatus {
  status: "online" | "offline" | "error"
  message?: string
}

export function NotificationsDashboard() {
  const [activeTab, setActiveTab] = useState("send")
  const [stats, setStats] = useState<DashboardStats>({
    totalSent: 0,
    successRate: 0,
    activeUsers: 0,
    failed: 0,
    pending: 0,
  })
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ status: "offline" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check API health
        const healthResponse = await fetch("/api/health")
        if (healthResponse.ok) {
          setApiStatus({ status: "online" })
        } else {
          setApiStatus({ status: "error", message: "API unhealthy" })
        }

        // Fetch notification stats
        const statsResponse = await fetch("/api/notifications/stats")
        if (statsResponse.ok) {
          const data = await statsResponse.json()
          const total = (data.sent || 0) + (data.failed || 0)
          const successRate = total > 0 ? ((data.sent || 0) / total) * 100 : 0

          setStats({
            totalSent: data.sent || 0,
            successRate: Math.round(successRate * 10) / 10,
            activeUsers: data.activeUsers || 0,
            failed: data.failed || 0,
            pending: data.pending || 0,
          })
        }
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard stats:", error)
        setApiStatus({ status: "error", message: "Connection failed" })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = () => {
    switch (apiStatus.status) {
      case "online":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            API Online
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            API Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
            API Offline
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BellIcon />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 text-balance">Notifications Hub</h1>
                <p className="text-lg text-gray-600 mt-1">Centralized notifications across all channels</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                <SettingsIcon />
                <span className="ml-2">Settings</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Sent</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <SendIcon />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {loading ? "..." : stats.totalSent.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Success Rate
              </CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChartIcon />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{loading ? "..." : `${stats.successRate}%`}</div>
              <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Active Users
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <UsersIcon />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {loading ? "..." : stats.activeUsers.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Failed</CardTitle>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertIcon />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{loading ? "..." : stats.failed.toLocaleString()}</div>
              <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending</CardTitle>
              <div className="p-2 bg-orange-100 rounded-lg">
                <BellIcon />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {loading ? "..." : stats.pending.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-1">In queue</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 px-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-50 p-1 rounded-lg">
                <TabsTrigger value="send" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Send Notification
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  History
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Users
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="send" className="mt-0">
                <SendNotificationForm />
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <NotificationsList />
              </TabsContent>

              <TabsContent value="users" className="mt-0">
                <UsersManagement />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <AnalyticsDashboard />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
