import { createTransport } from "nodemailer"

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
    // Validate config
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("Email configuration missing: EMAIL_USER and EMAIL_PASSWORD are required")
      return Response.json({
        error: "Email service not configured. Please contact administrator to set up email service.",
        code: "EMAIL_NOT_CONFIGURED"
      }, { status: 503 })
    }

    const { email, otp } = await request.json()
    if (!email || !otp) {
      return Response.json({ error: "email and otp are required" }, { status: 400 })
    }

    // Create transporter
    const transporter = createTransporter()
    if (!transporter) {
      return Response.json({ error: "Email service not available", code: "EMAIL_SERVICE_UNAVAILABLE" }, { status: 503 })
    }

    // Verify SMTP connection
    try {
      await transporter.verify()
    } catch (error) {
      console.error("SMTP Connection Error (verification):", error)
      return Response.json({
        error: "Email service connection failed. Please check your email configuration.",
        code: "SMTP_CONNECTION_FAILED",
        details: error.message
      }, { status: 500 })
    }

    const mailOptions = {
      from: { name: "MEGG", address: process.env.EMAIL_USER },
      to: email,
      subject: "Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #0066cc; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error sending verification email:", error)
    return Response.json({ error: "Failed to send verification email", details: error.message }, { status: 500 })
  }
}

