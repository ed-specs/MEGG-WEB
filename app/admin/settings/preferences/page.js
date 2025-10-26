"use client"
import { useState, useEffect } from "react"
import { Save, Bell, TriangleAlert } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { usePushNotifications } from "../../../hooks/notifications/UsePushNotification"
import { Navbar } from "../../../components/NavBar"
import { Header } from "../../../components/Header"
import { getCurrentUser } from "../../../utils/auth-utils"

export default function NotificationSettings() {
  const [globalMessage, setGlobalMessage] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [inAppNotifications, setInAppNotifications] = useState(false)
  const [defectAlerts, setDefectAlerts] = useState(false)
  const [machineAlerts, setMachineAlerts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const {
    permissionGranted,
    loading: pushLoading,
    error: pushError,
    enablePushNotifications,
    disablePushNotifications,
    getDebugInfo,
  } = usePushNotifications()

  // Load user notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const user = getCurrentUser()
        if (user) {
          // Check if notification settings document exists
          const settingsRef = doc(db, "notificationSettings", user.uid)
          const settingsSnap = await getDoc(settingsRef)

          if (settingsSnap.exists()) {
            const data = settingsSnap.data()
            setNotificationsEnabled(data.notificationsEnabled || false)
            setPushNotificationsEnabled(data.pushNotificationsEnabled || false)
            setEmailNotifications(data.emailNotifications || false)
            setInAppNotifications(data.inAppNotifications || false)
            setDefectAlerts(data.defectAlerts || false)
            setMachineAlerts(data.machineAlerts || false)

            // If push notifications are enabled in settings but not in browser, update settings
            if (data.pushNotificationsEnabled && !permissionGranted) {
              setPushNotificationsEnabled(false)
            }
          } else {
            // Create default settings if they don't exist
            const defaultSettings = {
              notificationsEnabled: false,
              pushNotificationsEnabled: false,
              emailNotifications: false,
              inAppNotifications: false,
              defectAlerts: false,
              machineAlerts: false,
              userId: user.uid,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            // Use setDoc instead of updateDoc for new documents
            await setDoc(settingsRef, defaultSettings)
          }
        }
      } catch (error) {
        console.error("Error loading notification settings:", error)
        setGlobalMessage("Error loading notification settings")
        setTimeout(() => setGlobalMessage(""), 5000)
      } finally {
        setLoading(false)
      }
    }

    loadNotificationSettings()
  }, [permissionGranted])

  // Save notification settings
  const saveNotificationSettings = async () => {
    try {
      const user = getCurrentUser()
      if (!user) {
        setGlobalMessage("Please log in to save settings")
        return
      }

      const settingsRef = doc(db, "notificationSettings", user.uid)

      // Check if the document exists first
      const settingsSnap = await getDoc(settingsRef)

      const settings = {
        notificationsEnabled,
        pushNotificationsEnabled,
        emailNotifications: notificationsEnabled ? emailNotifications : false,
        inAppNotifications: notificationsEnabled ? inAppNotifications : false,
        defectAlerts: pushNotificationsEnabled ? defectAlerts : false,
        machineAlerts: pushNotificationsEnabled ? machineAlerts : false,
        userId: user.uid,
        updatedAt: new Date(),
      }

      // If document doesn't exist, add createdAt field
      if (!settingsSnap.exists()) {
        settings.createdAt = new Date()
        await setDoc(settingsRef, settings)
      } else {
        await updateDoc(settingsRef, settings)
      }

      setGlobalMessage("Notification settings saved successfully!")
      setTimeout(() => {
        setGlobalMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error saving notification settings:", error)
      setGlobalMessage("Error saving notification settings")
      setTimeout(() => {
        setGlobalMessage("")
      }, 3000)
    }
  }

  const handlePushToggle = async () => {
    try {
      if (!pushNotificationsEnabled) {
        // Enable push notifications
        const granted = await enablePushNotifications()
        if (granted) {
          setPushNotificationsEnabled(true)

          // Send API request to trigger welcome notification
          const user = getCurrentUser()
          if (user) {
            await fetch("/api/notifications/update-notification-settings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.uid,
                pushNotificationsEnabled: true,
              }),
            })
          }
        } else {
          // Permission denied
          setGlobalMessage("Push notification permission denied. Please check your browser settings.")
          setTimeout(() => setGlobalMessage(""), 5000)
        }
      } else {
        // Disable push notifications
        await disablePushNotifications()
        setPushNotificationsEnabled(false)
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error)
      setGlobalMessage("Error toggling push notifications")
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  const handleDebugInfo = () => {
    const debugInfo = getDebugInfo()
    console.log("Push Notification Debug Info:", debugInfo)
    setShowDebugInfo(!showDebugInfo)
  }

  // Test basic browser notifications
  const testBasicNotification = () => {
    try {
      console.log("Testing basic browser notification...")
      console.log("Notification permission:", Notification.permission)
      
      if (Notification.permission === "granted") {
        const notification = new Notification("Test Notification", {
          body: "This is a test notification from MEGG TECH",
          icon: "/logo.png",
          badge: "/badge.png",
          tag: "test-notification",
          requireInteraction: true,
          silent: false,
        })
        
        notification.onclick = () => {
          console.log("Test notification clicked")
          notification.close()
          window.focus()
        }
        
        notification.onshow = () => {
          console.log("Test notification shown")
        }
        
        notification.onerror = (error) => {
          console.error("Test notification error:", error)
        }
        
        setGlobalMessage("Test notification sent! Check your notifications.")
        setTimeout(() => setGlobalMessage(""), 3000)
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            const notification = new Notification("Test Notification", {
              body: "This is a test notification from MEGG TECH",
              icon: "/logo.png",
              badge: "/badge.png",
              tag: "test-notification",
              requireInteraction: true,
              silent: false,
            })
            
            notification.onclick = () => {
              console.log("Test notification clicked")
              notification.close()
              window.focus()
            }
            
            setGlobalMessage("Test notification sent! Check your notifications.")
            setTimeout(() => setGlobalMessage(""), 3000)
          } else {
            setGlobalMessage("Notification permission denied")
            setTimeout(() => setGlobalMessage(""), 3000)
          }
        })
      } else {
        setGlobalMessage("Notification permission denied. Please enable in browser settings.")
        setTimeout(() => setGlobalMessage(""), 5000)
      }
    } catch (error) {
      console.error("Error testing notification:", error)
      setGlobalMessage("Error testing notification: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Force show notification (bypasses all checks)
  const forceShowNotification = () => {
    try {
      console.log("Force showing notification...")
      
      // Create multiple notifications to ensure one appears
      for (let i = 1; i <= 3; i++) {
        setTimeout(() => {
          try {
            const notification = new Notification(`MEGG TECH Alert ${i}`, {
              body: `This is a forced notification ${i} - if you see this, notifications work!`,
              icon: "/logo.png",
              badge: "/badge.png",
              tag: `force-notification-${i}`,
              requireInteraction: true,
              silent: false,
            })
            
            notification.onclick = () => {
              console.log(`Force notification ${i} clicked`)
              notification.close()
              window.focus()
            }
            
            notification.onshow = () => {
              console.log(`Force notification ${i} shown`)
            }
            
            console.log(`Force notification ${i} created`)
          } catch (error) {
            console.error(`Error creating force notification ${i}:`, error)
          }
        }, i * 1000)
      }
      
      setGlobalMessage("3 forced notifications sent! Check your screen.")
      setTimeout(() => setGlobalMessage(""), 5000)
    } catch (error) {
      console.error("Error force showing notification:", error)
      setGlobalMessage("Error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Check environment variables
  const checkEnvironment = () => {
    const envInfo = {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? "Set" : "Not Set",
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not Set",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Not Set",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "Set" : "Not Set",
    }
    console.log("Environment Variables:", envInfo)
    setGlobalMessage("Environment check logged to console")
    setTimeout(() => setGlobalMessage(""), 3000)
  }

  // Comprehensive notification test with different approaches
  const comprehensiveNotificationTest = () => {
    try {
      console.log("=== COMPREHENSIVE NOTIFICATION TEST ===")
      
      // Test 1: Basic notification
      console.log("Test 1: Basic notification")
      const notification1 = new Notification("Basic Test", {
        requireInteraction: true,
        silent: false,
      })
      
      notification1.onshow = () => {
        console.log("✅ Basic notification shown")
        setGlobalMessage("✅ Basic notification appeared!")
        setTimeout(() => setGlobalMessage(""), 3000)
      }
      
      // Test 2: Notification with body
      setTimeout(() => {
        console.log("Test 2: Notification with body")
        const notification2 = new Notification("Body Test", {
          body: "This notification has a body text",
          requireInteraction: true,
          silent: false,
        })
        
        notification2.onshow = () => {
          console.log("✅ Body notification shown")
          setGlobalMessage("✅ Body notification appeared!")
          setTimeout(() => setGlobalMessage(""), 3000)
        }
      }, 2000)
      
      // Test 3: Notification with icon
      setTimeout(() => {
        console.log("Test 3: Notification with icon")
        const notification3 = new Notification("Icon Test", {
          body: "This notification has an icon",
          icon: "/logo.png",
          requireInteraction: true,
          silent: false,
        })
        
        notification3.onshow = () => {
          console.log("✅ Icon notification shown")
          setGlobalMessage("✅ Icon notification appeared!")
          setTimeout(() => setGlobalMessage(""), 3000)
        }
      }, 4000)
      
      // Test 4: Simple notification without requireInteraction
      setTimeout(() => {
        console.log("Test 4: Simple notification")
        const notification4 = new Notification("Simple Test", {
          body: "This is a simple notification",
          silent: false,
        })
        
        notification4.onshow = () => {
          console.log("✅ Simple notification shown")
          setGlobalMessage("✅ Simple notification appeared!")
          setTimeout(() => setGlobalMessage(""), 3000)
        }
      }, 6000)
      
      setGlobalMessage("🚀 Running comprehensive notification test...")
      setTimeout(() => setGlobalMessage(""), 10000)
      
    } catch (error) {
      console.error("Comprehensive test error:", error)
      setGlobalMessage("❌ Error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Very obvious notification test
  const obviousNotificationTest = () => {
    try {
      console.log("Creating OBVIOUS notification test...")
      
      // Create a notification that's impossible to miss
      const notification = new Notification("🎉 NOTIFICATION TEST SUCCESSFUL! 🎉", {
        body: "If you can see this notification, then push notifications are WORKING! This notification will stay visible until you click it.",
        icon: "/logo.png",
        badge: "/badge.png",
        tag: "obvious-test",
        requireInteraction: true, // This makes it stay until clicked
        silent: false,
        data: {
          test: "obvious",
          timestamp: Date.now(),
        }
      })
      
      // Add event listeners
      notification.onclick = () => {
        console.log("OBVIOUS notification clicked!")
        notification.close()
        window.focus()
        setGlobalMessage("🎉 SUCCESS! You clicked the notification - they are working!")
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      notification.onshow = () => {
        console.log("OBVIOUS notification shown!")
        setGlobalMessage("🎉 NOTIFICATION APPEARED! Check your screen for a popup!")
        setTimeout(() => setGlobalMessage(""), 10000)
      }
      
      notification.onerror = (error) => {
        console.error("OBVIOUS notification error:", error)
        setGlobalMessage("❌ Notification error: " + error.message)
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      // Also create a second notification after 3 seconds
      setTimeout(() => {
        try {
          const secondNotification = new Notification("🔔 SECOND NOTIFICATION TEST", {
            body: "This is a second test notification to make sure you see it!",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "second-test",
            requireInteraction: false,
            silent: false,
          })
          
          secondNotification.onclick = () => {
            console.log("Second notification clicked!")
            secondNotification.close()
            window.focus()
          }
          
          console.log("Second notification created")
        } catch (error) {
          console.error("Error creating second notification:", error)
        }
      }, 3000)
      
      console.log("OBVIOUS notification created:", notification)
      
    } catch (error) {
      console.error("Error in obvious notification test:", error)
      setGlobalMessage("❌ Error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Audio notification test
  const audioNotificationTest = () => {
    try {
      console.log("Creating audio notification test...")
      
      // Create a notification with audio
      const notification = new Notification("🔊 AUDIO NOTIFICATION TEST", {
        body: "You should hear a sound and see this notification! Click to close.",
        icon: "/logo.png",
        badge: "/badge.png",
        tag: "audio-test",
        requireInteraction: true,
        silent: false, // This should play the default notification sound
      })
      
      // Also try to play a custom sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
        audio.play().catch(e => console.log("Audio play failed:", e))
      } catch (audioError) {
        console.log("Audio creation failed:", audioError)
      }
      
      notification.onclick = () => {
        console.log("Audio notification clicked!")
        notification.close()
        window.focus()
        setGlobalMessage("🔊 Audio notification clicked!")
        setTimeout(() => setGlobalMessage(""), 3000)
      }
      
      notification.onshow = () => {
        console.log("Audio notification shown!")
        setGlobalMessage("🔊 Audio notification appeared! Did you hear a sound?")
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      // Create multiple notifications with different sounds
      setTimeout(() => {
        new Notification("🔔 BELL NOTIFICATION", {
          body: "This is notification #2",
          requireInteraction: false,
          silent: false,
        })
      }, 2000)
      
      setTimeout(() => {
        new Notification("📢 ALERT NOTIFICATION", {
          body: "This is notification #3",
          requireInteraction: false,
          silent: false,
        })
      }, 4000)
      
      console.log("Audio notification test created")
      
    } catch (error) {
      console.error("Error in audio notification test:", error)
      setGlobalMessage("❌ Audio test error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Comprehensive diagnostic test
  const diagnosticTest = () => {
    try {
      console.log("=== NOTIFICATION DIAGNOSTIC TEST ===")
      
      const results = {
        timestamp: new Date().toISOString(),
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        },
        notification: {
          supported: "Notification" in window,
          permission: Notification.permission,
          maxActions: Notification.maxActions || "unknown",
        },
        window: {
          isSecureContext: window.isSecureContext,
          hasFocus: document.hasFocus(),
          visibilityState: document.visibilityState,
          hidden: document.hidden,
        },
        system: {
          doNotDisturb: "getInstalledRelatedApps" in navigator ? "unknown" : "not supported",
          focusMode: "getInstalledRelatedApps" in navigator ? "unknown" : "not supported",
        }
      }
      
      console.log("=== DIAGNOSTIC RESULTS ===")
      console.log(JSON.stringify(results, null, 2))
      
      // Check specific issues
      let issues = []
      let solutions = []
      
      // Issue 1: Not in secure context
      if (!window.isSecureContext) {
        issues.push("❌ Not in secure context (HTTPS required)")
        solutions.push("Use HTTPS or localhost for notifications")
      }
      
      // Issue 2: Permission not granted
      if (Notification.permission !== "granted") {
        issues.push("❌ Notification permission not granted")
        solutions.push("Click 'Request Permission' button")
      }
      
      // Issue 3: Window not focused
      if (!document.hasFocus()) {
        issues.push("⚠️ Browser window not focused")
        solutions.push("Click on the browser window to focus it")
      }
      
      // Issue 4: Page hidden
      if (document.hidden) {
        issues.push("⚠️ Page is hidden/backgrounded")
        solutions.push("Make sure the page is visible and active")
      }
      
      // Issue 5: Notifications not supported
      if (!("Notification" in window)) {
        issues.push("❌ Notifications not supported in this browser")
        solutions.push("Use a modern browser (Chrome, Firefox, Safari, Edge)")
      }
      
      // Display results
      let message = "=== DIAGNOSTIC RESULTS ===\n\n"
      
      if (issues.length === 0) {
        message += "✅ All checks passed! Notifications should work.\n\n"
        message += "If you still don't see notifications:\n"
        message += "1. Check your system notification settings\n"
        message += "2. Check browser notification settings\n"
        message += "3. Try a different browser\n"
        message += "4. Check if you're in incognito mode\n"
      } else {
        message += "Issues found:\n"
        issues.forEach(issue => message += issue + "\n")
        message += "\nSolutions:\n"
        solutions.forEach(solution => message += "• " + solution + "\n")
      }
      
      // Also try to create a notification with detailed logging
      if (Notification.permission === "granted") {
        console.log("Attempting to create diagnostic notification...")
        
        try {
          const notification = new Notification("🔍 DIAGNOSTIC TEST", {
            body: "This is a diagnostic notification. If you see this, notifications work!",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "diagnostic-test",
            requireInteraction: true,
            silent: false,
          })
          
          notification.onclick = () => {
            console.log("Diagnostic notification clicked!")
            notification.close()
            window.focus()
          }
          
          notification.onshow = () => {
            console.log("✅ Diagnostic notification SHOWN successfully!")
            setGlobalMessage("✅ NOTIFICATION SHOWN! If you don't see it, check your system settings.")
            setTimeout(() => setGlobalMessage(""), 10000)
          }
          
          notification.onerror = (error) => {
            console.error("❌ Diagnostic notification error:", error)
            setGlobalMessage("❌ Notification error: " + error.message)
            setTimeout(() => setGlobalMessage(""), 5000)
          }
          
          console.log("Diagnostic notification created:", notification)
          
        } catch (error) {
          console.error("Error creating diagnostic notification:", error)
          issues.push("❌ Error creating notification: " + error.message)
        }
      }
      
      // Show results in UI
      setGlobalMessage(message)
      setTimeout(() => setGlobalMessage(""), 15000)
      
      // Also log to console for easy copying
      console.log("=== COPY THIS FOR DEBUGGING ===")
      console.log(message)
      
    } catch (error) {
      console.error("Diagnostic test error:", error)
      setGlobalMessage("❌ Diagnostic error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Edge-specific diagnostic test
  const edgeDiagnosticTest = () => {
    try {
      console.log("=== MICROSOFT EDGE NOTIFICATION DIAGNOSTIC ===")
      
      const isEdge = navigator.userAgent.includes('Edg')
      const results = {
        browser: "Microsoft Edge",
        userAgent: navigator.userAgent,
        isEdge: isEdge,
        timestamp: new Date().toISOString(),
        notification: {
          supported: "Notification" in window,
          permission: Notification.permission,
        },
        window: {
          isSecureContext: window.isSecureContext,
          hasFocus: document.hasFocus(),
          visibilityState: document.visibilityState,
        }
      }
      
      console.log("=== EDGE DIAGNOSTIC RESULTS ===")
      console.log(JSON.stringify(results, null, 2))
      
      let issues = []
      let solutions = []
      
      if (!isEdge) {
        issues.push("⚠️ Not using Microsoft Edge")
        solutions.push("This test is optimized for Edge")
      }
      
      // Edge-specific checks
      if (Notification.permission !== "granted") {
        issues.push("❌ Notification permission not granted in Edge")
        solutions.push("1. Click the lock icon in address bar\n2. Set 'Notifications' to 'Allow'\n3. Refresh the page")
      }
      
      if (!window.isSecureContext) {
        issues.push("❌ Not in secure context")
        solutions.push("Use localhost or HTTPS (Edge requires secure context)")
      }
      
      // Edge-specific notification test
      if (Notification.permission === "granted") {
        console.log("Testing Edge notification...")
        
        try {
          const notification = new Notification("Edge Test", {
            body: "Microsoft Edge notification test - if you see this, it's working!",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "edge-test",
            requireInteraction: true,
            silent: false,
          })
          
          notification.onclick = () => {
            console.log("Edge notification clicked!")
            notification.close()
            window.focus()
          }
          
          notification.onshow = () => {
            console.log("✅ Edge notification shown!")
            setGlobalMessage("✅ Edge notification appeared! Check your screen.")
            setTimeout(() => setGlobalMessage(""), 5000)
          }
          
          notification.onerror = (error) => {
            console.error("❌ Edge notification error:", error)
            setGlobalMessage("❌ Edge notification error: " + error.message)
            setTimeout(() => setGlobalMessage(""), 5000)
          }
          
          console.log("Edge notification created:", notification)
          
        } catch (error) {
          console.error("Error creating Edge notification:", error)
          issues.push("❌ Error creating notification: " + error.message)
        }
      }
      
      // Edge-specific solutions
      let message = "=== MICROSOFT EDGE NOTIFICATION TROUBLESHOOTING ===\n\n"
      
      if (issues.length === 0) {
        message += "✅ All Edge checks passed!\n\n"
        message += "If notifications still don't appear:\n"
        message += "1. Check Edge notification settings (see below)\n"
        message += "2. Check Windows notification settings\n"
        message += "3. Try refreshing the page\n"
        message += "4. Check if Edge is in focus mode\n"
      } else {
        message += "Issues found:\n"
        issues.forEach(issue => message += issue + "\n")
        message += "\nSolutions:\n"
        solutions.forEach(solution => message += "• " + solution + "\n")
      }
      
      message += "\n=== EDGE-SPECIFIC SETTINGS ===\n"
      message += "1. Click the lock icon 🔒 in the address bar\n"
      message += "2. Set 'Notifications' to 'Allow'\n"
      message += "3. Go to Edge Settings > Cookies and site permissions > Notifications\n"
      message += "4. Make sure localhost is not blocked\n"
      message += "5. Check Windows Settings > System > Notifications > Edge\n"
      
      setGlobalMessage(message)
      setTimeout(() => setGlobalMessage(""), 20000)
      
      console.log("=== EDGE TROUBLESHOOTING INFO ===")
      console.log(message)
      
    } catch (error) {
      console.error("Edge diagnostic error:", error)
      setGlobalMessage("❌ Edge diagnostic error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Test basic browser notifications (no Firebase)
  const testBasicNotificationsOnly = () => {
    try {
      console.log("=== TESTING BASIC BROWSER NOTIFICATIONS ONLY ===")
      
      // Check if notifications are supported
      if (!("Notification" in window)) {
        setGlobalMessage("❌ Notifications not supported in this browser")
        setTimeout(() => setGlobalMessage(""), 5000)
        return
      }
      
      // Check permission
      if (Notification.permission !== "granted") {
        setGlobalMessage("❌ Notification permission not granted")
        setTimeout(() => setGlobalMessage(""), 5000)
        return
      }
      
      console.log("Creating basic notification without Firebase...")
      
      // Create a simple notification
      const notification = new Notification("Basic Browser Notification", {
        body: "This notification was created using only the browser's Notification API - no Firebase involved!",
        icon: "/logo.png",
        badge: "/badge.png",
        tag: "basic-test",
        requireInteraction: true,
        silent: false,
      })
      
      notification.onclick = () => {
        console.log("Basic notification clicked!")
        notification.close()
        window.focus()
        setGlobalMessage("✅ Basic notification clicked!")
        setTimeout(() => setGlobalMessage(""), 3000)
      }
      
      notification.onshow = () => {
        console.log("✅ Basic notification shown successfully!")
        setGlobalMessage("✅ BASIC NOTIFICATION APPEARED! This proves browser notifications work!")
        setTimeout(() => setGlobalMessage(""), 8000)
      }
      
      notification.onerror = (error) => {
        console.error("❌ Basic notification error:", error)
        setGlobalMessage("❌ Basic notification error: " + error.message)
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      console.log("Basic notification created:", notification)
      
      // Create a second notification after 2 seconds
      setTimeout(() => {
        try {
          const secondNotification = new Notification("Second Basic Notification", {
            body: "This is a second test notification to confirm they work!",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "basic-test-2",
            requireInteraction: false,
            silent: false,
          })
          
          secondNotification.onclick = () => {
            console.log("Second basic notification clicked!")
            secondNotification.close()
            window.focus()
          }
          
          secondNotification.onshow = () => {
            console.log("Second basic notification shown!")
          }
          
          console.log("Second basic notification created")
        } catch (error) {
          console.error("Error creating second basic notification:", error)
        }
      }, 2000)
      
    } catch (error) {
      console.error("Error in basic notification test:", error)
      setGlobalMessage("❌ Basic notification test error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Extremely obvious notification test
  const extremelyObviousTest = () => {
    try {
      console.log("=== EXTREMELY OBVIOUS NOTIFICATION TEST ===")
      
      // Create multiple notifications with different characteristics
      const notifications = [
        {
          title: "🎉 NOTIFICATION TEST 1 🎉",
          body: "This notification should appear on your screen RIGHT NOW!",
          tag: "test-1",
          requireInteraction: true,
        },
        {
          title: "🔔 NOTIFICATION TEST 2 🔔", 
          body: "If you see this, notifications are working!",
          tag: "test-2",
          requireInteraction: true,
        },
        {
          title: "📢 NOTIFICATION TEST 3 📢",
          body: "This is the third test notification!",
          tag: "test-3",
          requireInteraction: true,
        }
      ]
      
      notifications.forEach((config, index) => {
        setTimeout(() => {
          try {
            console.log(`Creating notification ${index + 1}...`)
            
            const notification = new Notification(config.title, {
              body: config.body,
              icon: "/logo.png",
              badge: "/badge.png",
              tag: config.tag,
              requireInteraction: config.requireInteraction,
              silent: false,
            })
            
            notification.onclick = () => {
              console.log(`Notification ${index + 1} clicked!`)
              notification.close()
              window.focus()
              setGlobalMessage(`✅ Notification ${index + 1} was clicked!`)
              setTimeout(() => setGlobalMessage(""), 3000)
            }
            
            notification.onshow = () => {
              console.log(`✅ Notification ${index + 1} SHOWN!`)
              setGlobalMessage(`🎉 NOTIFICATION ${index + 1} APPEARED! Check your screen!`)
              setTimeout(() => setGlobalMessage(""), 5000)
            }
            
            notification.onerror = (error) => {
              console.error(`❌ Notification ${index + 1} error:`, error)
              setGlobalMessage(`❌ Notification ${index + 1} error: ${error.message}`)
              setTimeout(() => setGlobalMessage(""), 5000)
            }
            
            console.log(`Notification ${index + 1} created:`, notification)
            
          } catch (error) {
            console.error(`Error creating notification ${index + 1}:`, error)
          }
        }, index * 2000) // 2 seconds apart
      })
      
      setGlobalMessage("🚀 Sending 3 extremely obvious notifications! Check your screen!")
      setTimeout(() => setGlobalMessage(""), 8000)
      
    } catch (error) {
      console.error("Error in extremely obvious test:", error)
      setGlobalMessage("❌ Error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  // Simple visibility test
  const simpleVisibilityTest = () => {
    try {
      console.log("=== SIMPLE VISIBILITY TEST ===")
      
      // Create a simple notification
      const notification = new Notification("VISIBILITY TEST", {
        body: "If you see this popup, notifications are working!",
        requireInteraction: true,
        silent: false,
      })
      
      // Add event listeners to track what happens
      notification.onclick = () => {
        console.log("✅ Notification was clicked!")
        notification.close()
        window.focus()
        setGlobalMessage("✅ Notification was clicked - it was visible!")
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      notification.onshow = () => {
        console.log("✅ Notification was shown!")
        setGlobalMessage("✅ Notification was shown! Did you see the popup?")
        setTimeout(() => setGlobalMessage(""), 8000)
      }
      
      notification.onerror = (error) => {
        console.error("❌ Notification error:", error)
        setGlobalMessage("❌ Notification error: " + error.message)
        setTimeout(() => setGlobalMessage(""), 5000)
      }
      
      notification.onclose = () => {
        console.log("Notification was closed")
      }
      
      console.log("Notification created:", notification)
      
      // Ask user if they saw it
      setTimeout(() => {
        const sawIt = confirm("Did you see a notification popup appear on your screen? Click OK if you saw it, Cancel if you didn't.")
        if (sawIt) {
          console.log("User confirmed they saw the notification")
          setGlobalMessage("🎉 GREAT! Notifications are working! The issue was just visibility.")
          setTimeout(() => setGlobalMessage(""), 5000)
        } else {
          console.log("User did not see the notification")
          setGlobalMessage("❌ Notification not visible. Check Windows notification settings and Focus Assist.")
          setTimeout(() => setGlobalMessage(""), 5000)
        }
      }, 3000)
      
    } catch (error) {
      console.error("Visibility test error:", error)
      setGlobalMessage("❌ Error: " + error.message)
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            <div className="flex w-full bg-white p-6 rounded-2xl border justify-center border-gray-300 shadow">
              <div className="w-full max-w-lg flex flex-col py-2 gap-6">
                {/* Global validation message */}
                {globalMessage && (
                  <div
                    className={`border-l-4 rounded-lg px-4 py-2 w-full flex items-center gap-2 ${
                      globalMessage.includes("successful")
                        ? "bg-green-100 border-green-500 text-green-500"
                        : "bg-red-100 border-red-500 text-red-500"
                    }`}
                  >
                    <TriangleAlert className="w-5 h-5" />
                    {globalMessage}
                  </div>
                )}

                {/* Notifications */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-medium">Notifications</span>
                      <span className="text-gray-500 text-sm">
                        Choose how you want to receive in-app alerts and updates.
                      </span>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {notificationsEnabled && (
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">Email notifications</span>
                            <span className="text-gray-500 text-sm">
                              Users receive alerts via email for important events
                            </span>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={emailNotifications}
                              onChange={() => setEmailNotifications(!emailNotifications)}
                            />
                            <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">In-app notifications</span>
                            <span className="text-gray-500 text-sm">
                              Users receive alerts in-app for important events
                            </span>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={inAppNotifications}
                              onChange={() => setInAppNotifications(!inAppNotifications)}
                            />
                            <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Push Notifications */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-medium">Push notifications</span>
                      <span className="text-gray-500 text-sm">
                        Receive alerts even when you're not actively using the app.
                      </span>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushNotificationsEnabled}
                        onChange={handlePushToggle}
                        disabled={pushLoading}
                        className="sr-only peer"
                      />
                      <div className={`relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${pushLoading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </label>
                  </div>
                  
                  {pushLoading && (
                    <div className="text-blue-500 text-sm mt-2 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      {pushNotificationsEnabled ? "Disabling..." : "Enabling..."}
                    </div>
                  )}
                  
                  {pushError && (
                    <div className="text-red-500 text-sm mt-2 bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-medium mb-1">Push Notification Error:</div>
                      <div>{pushError}</div>
                      <button
                        onClick={handleDebugInfo}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
                      >
                        {showDebugInfo ? "Hide" : "Show"} Debug Info
                      </button>
                    </div>
                  )}

                  {showDebugInfo && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="text-sm font-medium mb-2">Debug Information:</div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(getDebugInfo(), null, 2)}
                      </pre>
                      
                      {/* Debug Buttons */}
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          onClick={testBasicNotification}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                          Test Basic Notification
                        </button>
                        <button
                          onClick={forceShowNotification}
                          className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                        >
                          Force Show Notification
                        </button>
                        <button
                          onClick={() => {
                            // Simplest possible notification
                            try {
                              new Notification("Simple Test")
                              setGlobalMessage("Simple notification sent!")
                              setTimeout(() => setGlobalMessage(""), 3000)
                            } catch (error) {
                              setGlobalMessage("Simple notification failed: " + error.message)
                              setTimeout(() => setGlobalMessage(""), 5000)
                            }
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Simple Test
                        </button>
                        <button
                          onClick={checkEnvironment}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                        >
                          Check Environment
                        </button>
                        <button
                          onClick={comprehensiveNotificationTest}
                          className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                        >
                          Comprehensive Notification Test
                        </button>
                        <button
                          onClick={obviousNotificationTest}
                          className="px-3 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                        >
                          Obvious Notification Test
                        </button>
                        <button
                          onClick={audioNotificationTest}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600"
                        >
                          Audio Notification Test
                        </button>
                        <button
                          onClick={diagnosticTest}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600"
                        >
                          Diagnostic Test
                        </button>
                        <button
                          onClick={() => {
                            const commands = [
                              '// Test 1: Simple notification',
                              'new Notification("SIMPLE TEST", {requireInteraction: true})',
                              '',
                              '// Test 2: Notification with body',
                              'new Notification("TEST WITH BODY", {body: "This should appear on your screen", requireInteraction: true})',
                              '',
                              '// Test 3: Check permission',
                              'console.log("Permission:", Notification.permission)',
                              '',
                              '// Copy and paste these commands one by one into your browser console (F12)'
                            ]
                            
                            console.log("=== CONSOLE TEST COMMANDS ===")
                            commands.forEach(cmd => console.log(cmd))
                            console.log("=== END COMMANDS ===")
                            
                            setGlobalMessage("Console commands logged. Press F12, go to Console tab, and run the commands one by one.")
                            setTimeout(() => setGlobalMessage(""), 8000)
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Console Commands Test
                        </button>
                        <button
                          onClick={() => {
                            const isEdge = navigator.userAgent.includes('Edg')
                            let message = "=== MICROSOFT EDGE NOTIFICATION TROUBLESHOOTING ===\n\n"
                            
                            if (isEdge) {
                              message += "✅ You're using Microsoft Edge\n\n"
                              message += "=== EDGE-SPECIFIC STEPS ===\n"
                              message += "1. Click the lock icon 🔒 in the address bar\n"
                              message += "2. Set 'Notifications' to 'Allow'\n"
                              message += "3. Go to Edge Settings > Cookies and site permissions > Notifications\n"
                              message += "4. Make sure localhost is not blocked\n"
                              message += "5. Check Windows Settings > System > Notifications > Edge\n"
                              message += "6. Try refreshing the page after changing settings\n\n"
                              message += "=== WINDOWS SETTINGS ===\n"
                              message += "1. Press Win + I to open Settings\n"
                              message += "2. Go to System > Notifications & actions\n"
                              message += "3. Make sure 'Get notifications from apps and other senders' is ON\n"
                              message += "4. Scroll down and ensure Edge is allowed\n\n"
                              message += "=== TEST NOTIFICATION ===\n"
                              message += "After changing settings, try the 'Obvious Notification Test' button"
                            } else {
                              message += "❌ You're not using Microsoft Edge\n"
                              message += "Current browser: " + navigator.userAgent
                            }
                            
                            setGlobalMessage(message)
                            setTimeout(() => setGlobalMessage(""), 25000)
                            console.log("=== EDGE TROUBLESHOOTING ===")
                            console.log(message)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Edge Troubleshooting
                        </button>
                        <button
                          onClick={testBasicNotificationsOnly}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Basic Notifications Only
                        </button>
                        <button
                          onClick={extremelyObviousTest}
                          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                        >
                          Extremely Obvious Notification Test
                        </button>
                        <button
                          onClick={simpleVisibilityTest}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600"
                        >
                          Simple Visibility Test
                        </button>
                      </div>
                    </div>
                  )}

                  {pushNotificationsEnabled && (
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">Defect alerts</span>
                            <span className="text-gray-500 text-sm">
                              Users receive alerts of defected eggs
                            </span>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={defectAlerts}
                              onChange={() => setDefectAlerts(!defectAlerts)}
                            />
                            <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">Machine alerts</span>
                            <span className="text-gray-500 text-sm">
                              Users receive alerts of machines activity
                            </span>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={machineAlerts}
                              onChange={() => setMachineAlerts(!machineAlerts)}
                            />
                            <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={saveNotificationSettings}
                    className="px-4 py-2 rounded-lg bg-blue-500 transition-colors duration-150 hover:bg-blue-600 text-white flex items-center gap-4"
                  >
                    <Save className="w-5 h-5" />
                    Save settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
