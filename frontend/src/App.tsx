"use client"

import { useState, useEffect } from "react"
import { NotificationsDashboard } from "./components/NotificationsDashboard"
import { ApiService } from "./services/api"

function App() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check backend connection
    ApiService.checkHealth()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {!isConnected && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Backend connection failed. Make sure the backend server is running on port 3001.
              </p>
            </div>
          </div>
        </div>
      )}
      <NotificationsDashboard />
    </div>
  )
}

export default App
