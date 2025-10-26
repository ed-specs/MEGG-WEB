import { getToken, onMessage, isSupported } from "firebase/messaging"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "../../config/firebaseConfig"
import { getCurrentUser } from "../../utils/auth-utils"

// FCM Vapid Key from your Firebase console
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

// Initialize Firebase Cloud Messaging
let messaging = null

// Check if FCM is supported in this browser
export const isFCMSupported = async () => {
  try {
    return await isSupported()
  } catch (error) {
    console.error("Error checking FCM support:", error)
    return false
  }
}

// Initialize messaging if it hasn't been initialized yet
const initializeMessaging = async () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      console.log("Not in browser environment, skipping messaging initialization")
      return false
    }

    // Check if FCM is supported
    const fcmSupported = await isFCMSupported()
    if (!fcmSupported) {
      console.log("Firebase Cloud Messaging is not supported in this browser")
      return false
    }

    // Check if VAPID key is available
    if (!vapidKey) {
      console.log("VAPID key is not configured, using browser notifications only")
      return false
    }

    // Import firebase/app dynamically to avoid SSR issues
    const { getApp } = await import("firebase/app")

    try {
      // Get the existing Firebase app instance
      const app = getApp()

      // Initialize messaging with the existing app
      if (!messaging) {
        const { getMessaging: getMessagingImport } = await import("firebase/messaging")
        messaging = getMessagingImport(app)
        console.log("Firebase messaging initialized successfully")
      }

      return true
    } catch (error) {
      console.error("Error getting Firebase app:", error)
      return false
    }
  } catch (error) {
    console.error("Error initializing messaging:", error)
    return false
  }
}

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    console.log("Requesting notification permission...")
    
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      console.log("Not in browser environment")
      return false
    }

    // Check if Notification API is supported
    if (!("Notification" in window)) {
      console.log("Notification API not supported")
      return false
    }

    // Request permission first
    const permission = await Notification.requestPermission()
    console.log("Notification permission result:", permission)
    
    if (permission !== "granted") {
      console.log("Notification permission denied")
      return false
    }

    // Try to initialize FCM (optional enhancement)
    try {
      const initialized = await initializeMessaging()
      if (initialized) {
        // Get FCM token
        try {
          console.log("Getting FCM token...")
          const currentToken = await getToken(messaging, { vapidKey })

          if (currentToken) {
            console.log("FCM Token obtained successfully")

            // Save the token to Firestore
            const user = getCurrentUser()
            if (user) {
              await saveTokenToFirestore(currentToken, user.uid)
            }
          } else {
            console.log("No registration token available")
          }
        } catch (tokenError) {
          console.error("Error getting FCM token:", tokenError)
          console.log("FCM failed, but browser notifications will still work")
          // Continue with browser notifications even if FCM fails
        }
      } else {
        console.log("FCM initialization failed, using browser notifications only")
      }
    } catch (fcmError) {
      console.error("FCM error:", fcmError)
      console.log("FCM failed, but browser notifications will still work")
      // Continue with browser notifications even if FCM fails
    }

    return true // Return true since we have browser notification permission
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return false
  }
}

// Save FCM token to Firestore
const saveTokenToFirestore = async (token, userId) => {
  try {
    const tokenRef = doc(db, "fcmTokens", userId)
    await setDoc(
      tokenRef,
      {
        token,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    )

    console.log("Token saved to Firestore")
  } catch (error) {
    console.error("Error saving token to Firestore:", error)
  }
}

// Set up foreground message handler
export const setupForegroundMessageHandler = async () => {
  try {
    const initialized = await initializeMessaging()
    if (!initialized || !messaging) {
      console.log("Cannot setup foreground handler - messaging not initialized")
      return
    }

    onMessage(messaging, (payload) => {
      console.log("Message received in the foreground:", payload)

      // Display the notification using the Notification API
      if (payload.notification) {
        const { title, body } = payload.notification

        new Notification(title || "MEGG TECH", {
          body: body || "You have a new notification",
          icon: "/logo.png",
          badge: "/badge.png",
        })
      }
    })

    console.log("Foreground message handler setup successfully")
  } catch (error) {
    console.error("Error setting up foreground message handler:", error)
  }
}

// Show a welcome notification directly from the browser
const showWelcomeNotification = () => {
  try {
    console.log("Attempting to show welcome notification...")
    console.log("Notification permission:", Notification.permission)
    
    if (Notification.permission === "granted") {
      console.log("Creating welcome notification...")
      
      const notification = new Notification("Welcome to MEGG TECH", {
        body: "You will now receive notifications for important updates",
        icon: "/logo.png",
        badge: "/badge.png",
        tag: "welcome-notification",
        requireInteraction: true, // Keep notification visible until user interacts
        silent: false, // Play notification sound
      })
      
      console.log("Welcome notification created:", notification)
      
      // Add event listeners to track notification behavior
      notification.onclick = () => {
        console.log("Welcome notification clicked")
        notification.close()
        window.focus()
      }
      
      notification.onshow = () => {
        console.log("Welcome notification shown")
      }
      
      notification.onerror = (error) => {
        console.error("Welcome notification error:", error)
      }
      
      notification.onclose = () => {
        console.log("Welcome notification closed")
      }
      
      return true
    } else {
      console.log("Notification permission not granted:", Notification.permission)
      return false
    }
  } catch (error) {
    console.error("Error showing welcome notification:", error)
    return false
  }
}

// Send welcome notification when push notifications are enabled
export const sendWelcomeNotification = async (userId) => {
  try {
    console.log("Sending welcome notification for user:", userId)

    // Always show a local notification first (this works regardless of Firebase)
    console.log("Showing immediate welcome notification...")
    const localNotificationShown = showWelcomeNotification()
    console.log("Local notification result:", localNotificationShown)

    // Show a second notification to ensure it appears
    setTimeout(() => {
      try {
        console.log("Showing second welcome notification...")
        const secondNotification = new Notification("MEGG TECH Notifications Enabled", {
          body: "You will now receive alerts for defects and machine activity",
          icon: "/logo.png",
          badge: "/badge.png",
          tag: "second-welcome-notification",
          requireInteraction: true, // This makes it stay until clicked
          silent: false,
        })
        
        secondNotification.onclick = () => {
          console.log("Second welcome notification clicked")
          secondNotification.close()
          window.focus()
        }
        
        secondNotification.onshow = () => {
          console.log("Second welcome notification shown")
        }
        
        console.log("Second welcome notification created")
      } catch (error) {
        console.error("Error creating second notification:", error)
      }
    }, 1000)

    // Try to call the API to send a server-side notification (optional)
    try {
      const response = await fetch("/api/notifications/send-welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        console.log("Welcome notification API call successful")
      } else {
        console.warn("Welcome notification API call failed, but local notifications were shown")
      }
    } catch (apiError) {
      console.error("API call error:", apiError)
      console.log("Local notifications were shown successfully")
    }

    return localNotificationShown
  } catch (error) {
    console.error("Error sending welcome notification:", error)

    // Try to show a local notification as a last resort
    return showWelcomeNotification()
  }
}

// Unsubscribe from notifications
export const unsubscribeFromNotifications = async (userId) => {
  try {
    // Delete the token from Firestore
    const tokenRef = doc(db, "fcmTokens", userId)
    await setDoc(
      tokenRef,
      {
        token: null,
        updatedAt: new Date(),
      },
      { merge: true },
    )

    console.log("Unsubscribed from notifications")
    return true
  } catch (error) {
    console.error("Error unsubscribing from notifications:", error)
    return false
  }
}

