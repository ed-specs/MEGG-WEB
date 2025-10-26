"use client"

import { useState, useEffect } from "react"
import { auth } from "../../config/firebaseConfig"
import {
  requestNotificationPermission,
  setupForegroundMessageHandler,
  sendWelcomeNotification,
  unsubscribeFromNotifications,
  isFCMSupported,
} from "../../lib/notifications/FirebaseMessaging"
import { getCurrentUser } from "../../utils/auth-utils"

export function usePushNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSupported, setIsSupported] = useState(true)
  const [debugInfo, setDebugInfo] = useState({})

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        console.log("Initializing push notifications...")
        
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          setDebugInfo(prev => ({ ...prev, environment: "server" }))
          setLoading(false)
          return
        }

        setDebugInfo(prev => ({ ...prev, environment: "browser" }))

        // Check if notifications are supported
        if (!("Notification" in window)) {
          setIsSupported(false)
          setError("This browser does not support push notifications")
          setDebugInfo(prev => ({ ...prev, notificationAPI: false }))
          setLoading(false)
          return
        }

        setDebugInfo(prev => ({ ...prev, notificationAPI: true }))

        // Check current permission status
        const currentPermission = Notification.permission
        setDebugInfo(prev => ({ ...prev, currentPermission }))

        if (currentPermission === "granted") {
          setPermissionGranted(true)
          console.log("Notification permission already granted")
        }

        // Check if FCM is supported
        const fcmSupported = await isFCMSupported()
        setDebugInfo(prev => ({ ...prev, fcmSupported }))
        
        if (!fcmSupported) {
          console.log("FCM not supported, but browser notifications are available")
          // Don't set isSupported to false here, as browser notifications still work
        }

        // Setup foreground handler if permission is already granted
        if (currentPermission === "granted") {
          await setupForegroundMessageHandler()
        }

        setLoading(false)
      } catch (err) {
        console.error("Error initializing push notifications:", err)
        setError(err.message)
        setDebugInfo(prev => ({ ...prev, initError: err.message }))
        setLoading(false)
      }
    }

    initializePushNotifications()
  }, [])

  // Request permission and register for push notifications
  const enablePushNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Enabling push notifications...")

      if (typeof window === "undefined") {
        setError("Cannot enable notifications on server side")
        setLoading(false)
        return false
      }

      if (!("Notification" in window)) {
        setError("Push notifications are not supported in this browser")
        setLoading(false)
        return false
      }

      const granted = await requestNotificationPermission()
      console.log("Permission request result:", granted)

      if (granted) {
        setPermissionGranted(true)
        await setupForegroundMessageHandler()

        // Send welcome notification
        const user = getCurrentUser()
        if (user) {
          console.log("Sending welcome notification...")
          const welcomeSent = await sendWelcomeNotification(user.uid)
          setDebugInfo(prev => ({ ...prev, welcomeNotificationSent: welcomeSent }))
        }

        setDebugInfo(prev => ({ ...prev, permissionGranted: true }))
      } else {
        setError("Notification permission was denied")
        setDebugInfo(prev => ({ ...prev, permissionDenied: true }))
      }

      setLoading(false)
      return granted
    } catch (err) {
      console.error("Error enabling push notifications:", err)
      setError(err.message)
      setDebugInfo(prev => ({ ...prev, enableError: err.message }))
      setLoading(false)
      return false
    }
  }

  // Disable push notifications
  const disablePushNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Disabling push notifications...")

      const user = getCurrentUser()
      if (user) {
        await unsubscribeFromNotifications(user.uid)
      }

      setPermissionGranted(false)
      setDebugInfo(prev => ({ ...prev, permissionGranted: false }))
      setLoading(false)
      return true
    } catch (err) {
      console.error("Error disabling push notifications:", err)
      setError(err.message)
      setDebugInfo(prev => ({ ...prev, disableError: err.message }))
      setLoading(false)
      return false
    }
  }

  // Get debug information for troubleshooting
  const getDebugInfo = () => {
    return {
      ...debugInfo,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
      timestamp: new Date().toISOString(),
    }
  }

  return {
    permissionGranted,
    loading,
    error,
    isSupported,
    enablePushNotifications,
    disablePushNotifications,
    getDebugInfo,
  }
}

