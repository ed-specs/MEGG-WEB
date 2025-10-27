import { NextResponse } from "next/server"
import { getAdminServices } from "../../../config/firebase-admin"

export async function POST(request) {
  console.log("API route called: update-notification-settings")

  try {
    // Parse the request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    const { userId, pushNotificationsEnabled } = body

    if (!userId) {
      console.log("Missing userId in request")
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    console.log(`Updating notification settings for user ${userId}, push enabled: ${pushNotificationsEnabled}`)

    // If push notifications are enabled, send a welcome notification
    if (pushNotificationsEnabled) {
      try {
        const { firestore, messaging } = getAdminServices()
        console.log("Firestore initialized")

        // Get the user's FCM token
        console.log(`Fetching FCM token for user ${userId}`)
        const tokenDoc = await firestore.collection("fcmTokens").doc(userId).get()

        if (tokenDoc.exists && tokenDoc.data().token) {
          const token = tokenDoc.data().token
          console.log(`Found token: ${token.substring(0, 10)}...`)

          // Send the welcome notification
          console.log("Sending welcome notification...")
          await messaging.send({
            token: token,
            notification: {
              title: "Welcome to MEGG TECH",
              body: "HI THERE WELCOME TO MEGG TECH",
            },
            webpush: {
              notification: {
                icon: "/logo.png",
                badge: "/badge.png",
              },
            },
          })

          console.log("Welcome notification sent successfully")
        } else {
          console.log("No FCM token found for this user")
        }
      } catch (notificationError) {
        console.error("Error sending welcome notification:", notificationError)
        // Continue execution even if notification fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in update-notification-settings API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

