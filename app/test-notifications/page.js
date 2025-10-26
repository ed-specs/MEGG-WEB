"use client"

import { useState } from "react"

export default function TestNotifications() {
  const [permission, setPermission] = useState("default")
  const [message, setMessage] = useState("")

  // Check current permission status
  const checkPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
      setMessage(`Current permission: ${Notification.permission}`)
    } else {
      setMessage("Notifications not supported in this browser")
    }
  }

  // Request permission
  const requestPermission = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const result = await Notification.requestPermission()
        setPermission(result)
        setMessage(`Permission result: ${result}`)
      }
    } catch (error) {
      setMessage(`Error requesting permission: ${error.message}`)
    }
  }

  // Send test notification
  const sendTestNotification = () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Test Notification", {
            body: "This is a test notification from MEGG TECH",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "test-notification",
          })
          setMessage("Test notification sent!")
        } else {
          setMessage("Permission not granted. Please request permission first.")
        }
      }
    } catch (error) {
      setMessage(`Error sending notification: ${error.message}`)
    }
  }

  // Send multiple test notifications
  const sendMultipleNotifications = () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          for (let i = 1; i <= 3; i++) {
            setTimeout(() => {
              new Notification(`Test Notification ${i}`, {
                body: `This is test notification number ${i}`,
                icon: "/logo.png",
                badge: "/badge.png",
                tag: `test-notification-${i}`,
              })
            }, i * 1000)
          }
          setMessage("3 test notifications sent with 1-second intervals!")
        } else {
          setMessage("Permission not granted. Please request permission first.")
        }
      }
    } catch (error) {
      setMessage(`Error sending notifications: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6">Notification Test Page</h1>
        
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Status</h2>
            <p><strong>Permission:</strong> {permission}</p>
            <p><strong>Notifications Supported:</strong> {typeof window !== "undefined" && "Notification" in window ? "Yes" : "No"}</p>
            <p><strong>Service Worker:</strong> {typeof window !== "undefined" && "serviceWorker" in navigator ? "Supported" : "Not Supported"}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={checkPermission}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Check Permission
              </button>
              <button
                onClick={requestPermission}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Request Permission
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={sendTestNotification}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Send Test Notification
              </button>
              <button
                onClick={sendMultipleNotifications}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Send Multiple Notifications
              </button>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Check Permission" to see current status</li>
              <li>Click "Request Permission" to ask for notification permission</li>
              <li>Click "Send Test Notification" to send a single notification</li>
              <li>Click "Send Multiple Notifications" to send 3 notifications with delays</li>
            </ol>
          </div>

          {/* Troubleshooting */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Troubleshooting:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>If notifications don't appear, check your browser's notification settings</li>
              <li>Make sure you're not in incognito/private mode</li>
              <li>Some browsers require HTTPS for notifications</li>
              <li>Check if notifications are blocked for this site</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 