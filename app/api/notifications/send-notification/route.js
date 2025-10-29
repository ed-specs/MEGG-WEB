import { NextResponse } from "next/server"
import { getAdminServices } from "../../../config/firebase-admin"
import { createTransport } from "nodemailer"

export async function POST(request) {
  try {
    const { userId, title, body, data } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    const { firestore, messaging } = getAdminServices()

    // Check if notifications are enabled for this user
    const settingsDoc = await firestore.collection("notificationSettings").doc(userId).get()
    const settings = settingsDoc.exists ? settingsDoc.data() : {}
    if (!settings || settings.notificationsEnabled === false) {
      return NextResponse.json({ success: false, error: "Notifications are disabled for this user" }, { status: 403 })
    }

    // In-app creation if enabled
    let createdId = null
    if (settings.inAppNotifications !== false) {
      const userSnap = await firestore.collection("users").doc(userId).get()
      const profileImage = userSnap.exists && userSnap.data().profileImageUrl ? userSnap.data().profileImageUrl : "/default.png"
      const notifDoc = await firestore.collection("notifications").add({
        userId,
        message: body || "You have a new notification",
        type: (data && data.type) || "general",
        read: false,
        createdAt: new Date(),
        profileImage,
      })
      createdId = notifDoc.id
    }

    // Push via FCM if token available
    try {
      const tokenDoc = await firestore.collection("fcmTokens").doc(userId).get()
      const token = tokenDoc.exists && tokenDoc.data().token
      if (token) {
        await messaging.send({
          token,
          notification: {
            title: title || "Notification",
            body: body || "You have a new notification",
          },
          data: data || {},
          webpush: { notification: { icon: "/logo.png", badge: "/badge.png" } },
        })
      }
    } catch (e) {
      // Log but do not fail the request if push fails
      console.error("FCM send error:", e)
    }

    // Email notification if enabled
    if (settings.emailNotifications && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const userSnap = await firestore.collection("users").doc(userId).get()
        const toEmail = userSnap.exists && userSnap.data().email
        if (toEmail) {
          const transporter = createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
            tls: { rejectUnauthorized: false, ciphers: "SSLv3" },
            requireTLS: true,
          })
          await transporter.verify()
          await transporter.sendMail({
            from: { name: "MEGG", address: process.env.EMAIL_USER },
            to: toEmail,
            subject: title || "Notification",
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;"><h2 style="color:#333;">${title || "Notification"}</h2><p>${body || "You have a new notification."}</p></div>`,
          })
        }
      } catch (e) {
        console.error("Email notification send error:", e)
      }
    }

    return NextResponse.json({ success: true, id: createdId })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

