export async function GET() {
  const debugInfo = {
    emailUser: process.env.EMAIL_USER ? "Set" : "Missing",
    emailPassword: process.env.EMAIL_PASSWORD ? "Set" : "Missing",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ? "Set" : "Missing",
    nodeEnv: process.env.NODE_ENV || "Not set",
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('EMAIL') || key.includes('APP_URL') || key.includes('NEXT_PUBLIC')
    )
  }

  return Response.json({
    status: "debug",
    message: "Email configuration debug information",
    debugInfo,
    recommendations: []
  })
} 