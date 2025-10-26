import { createTransport } from "nodemailer"

export async function GET() {
  const results = {
    envCheck: {},
    smtpTest: {},
    recommendations: []
  }

  // Check environment variables
  results.envCheck.emailUser = process.env.EMAIL_USER ? "✅ Set" : "❌ Missing"
  results.envCheck.emailPassword = process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Missing"
  results.envCheck.appUrl = process.env.NEXT_PUBLIC_APP_URL ? "✅ Set" : "❌ Missing"

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    results.recommendations.push("Set EMAIL_USER and EMAIL_PASSWORD environment variables")
    return Response.json(results)
  }

  // Test SMTP connection
  try {
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

    // Test connection
    await transporter.verify()
    results.smtpTest.connection = "✅ Success"
    results.smtpTest.email = process.env.EMAIL_USER

    // Try to send a test email
    try {
      const testMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self for testing
        subject: "Email Service Test",
        text: "This is a test email to verify the email service is working correctly.",
      }

      await transporter.sendMail(testMailOptions)
      results.smtpTest.sendTest = "✅ Success"
      results.recommendations.push("Email service is working correctly!")
    } catch (sendError) {
      results.smtpTest.sendTest = `❌ Failed: ${sendError.message}`
      results.recommendations.push("SMTP connection works but sending failed - check Gmail settings")
    }

  } catch (error) {
    results.smtpTest.connection = `❌ Failed: ${error.message}`
    
    // Provide specific recommendations based on error
    if (error.message.includes("Invalid login")) {
      results.recommendations.push("Invalid Gmail credentials - check your App Password")
      results.recommendations.push("Make sure you're using an App Password, not your regular password")
    } else if (error.message.includes("ECONNREFUSED")) {
      results.recommendations.push("Connection refused - check your internet connection")
    } else if (error.message.includes("timeout")) {
      results.recommendations.push("Connection timeout - check your internet connection")
    } else {
      results.recommendations.push(`SMTP Error: ${error.message}`)
    }
  }

  return Response.json(results)
} 