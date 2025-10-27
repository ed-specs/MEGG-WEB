import { NextResponse } from "next/server"
import { getAdminServices } from "../../../config/firebase-admin"

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    const { firestore, messaging } = getAdminServices()

    // Get the user's FCM token from Firestore
    const tokenDoc = await firestore.collection("fcmTokens").doc(userId).get()

    if (!tokenDoc.exists || !tokenDoc.data().token) {
      return NextResponse.json({ success: false, error: "No FCM token found for this user" }, { status: 404 })
    }

    const token = tokenDoc.data().token

    // Send the welcome notification
    await messaging.send({
      token: token,
      notification: {
        title: "Welcome to MEGG TECH",
        body: "HI THERE WELCOME TO MEGG TECH",
      },
      android: {
        notification: {
          icon: "ic_notification",
          color: "#4285F4",
        },
      },
      apns: {
        payload: {
          aps: {
            "mutable-content": 1,
          },
        },
        fcmOptions: {
          image: "https://your-domain.com/logo.png",
        },
      },
      webpush: {
        notification: {
          icon: "/logo.png",
          badge: "/badge.png",
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

