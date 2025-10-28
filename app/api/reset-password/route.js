import { createTransport } from "nodemailer"
import { db } from "../../config/firebaseConfig"
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore"
import { generateResetToken } from "../../utils/token"

// Create transporter only if email credentials are available
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null
  }

  return createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    requireTLS: true,
    logger: false,
    debug: false
  })
}

export async function POST(request) {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("Email configuration missing: EMAIL_USER and EMAIL_PASSWORD environment variables are required")
      return Response.json({ 
        error: "Email service not configured. Please contact administrator to set up email service.",
        code: "EMAIL_NOT_CONFIGURED"
      }, { status: 503 })
    }

    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 })
    }

    // Generate reset token
    const { resetToken, hash, expiryDate } = generateResetToken()

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return Response.json({ error: "User not found" }, { status: 404 })
      }

      const userDoc = querySnapshot.docs[0]
      const userId = userDoc.id

      // Update user document with reset token
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        resetPasswordToken: hash,
        resetPasswordExpiry: expiryDate,
      })

      if (!process.env.NEXT_PUBLIC_APP_URL) {
        console.error("NEXT_PUBLIC_APP_URL not configured")
        return Response.json({ 
          error: "Server configuration error. NEXT_PUBLIC_APP_URL is missing.",
          code: "APP_URL_NOT_CONFIGURED"
        }, { status: 500 })
      }

      // Create reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${email}`

      // Create transporter
      const transporter = createTransporter()
      if (!transporter) {
        return Response.json({ 
          error: "Email service not available",
          code: "EMAIL_SERVICE_UNAVAILABLE"
        }, { status: 503 })
      }

      // Setup email data
      const mailOptions = {
        from: {
          name: "MEGG",
          address: process.env.EMAIL_USER,
        },
        to: email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      }

      // Verify SMTP connection
      try {
        await transporter.verify()
      } catch (error) {
        console.error("SMTP Connection Error:", error)
        return Response.json({ 
          error: "Email service connection failed. Please check your email configuration.",
          code: "SMTP_CONNECTION_FAILED",
          details: error.message
        }, { status: 500 })
      }

      // Send mail
      await transporter.sendMail(mailOptions)
      return Response.json({ 
        success: true,
        message: "Password reset email sent successfully"
      })
    } catch (error) {
      console.error("Operation error:", error)
      throw error
    }
  } catch (error) {
    console.error("Error sending reset email:", error)
    return Response.json(
      {
        error: "Failed to send reset email",
        code: "GENERAL_ERROR",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

