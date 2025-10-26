import { createTransport } from "nodemailer"

export async function GET() {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return Response.json({
        status: "error",
        message: "Email configuration missing",
        details: "EMAIL_USER and EMAIL_PASSWORD environment variables are required",
        configured: false
      }, { status: 503 })
    }

    // Create transporter
    const transporter = createTransport({
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

    // Test SMTP connection
    try {
      await transporter.verify()
      return Response.json({
        status: "success",
        message: "Email service is properly configured and connected",
        configured: true,
        email: process.env.EMAIL_USER
      })
    } catch (error) {
      return Response.json({
        status: "error",
        message: "SMTP connection failed",
        details: error.message,
        configured: false
      }, { status: 500 })
    }
  } catch (error) {
    return Response.json({
      status: "error",
      message: "Unexpected error",
      details: error.message,
      configured: false
    }, { status: 500 })
  }
} 