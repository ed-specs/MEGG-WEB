"use client"

import { useState } from "react"

export default function TestEmailConfig() {
  const [status, setStatus] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [detailedTest, setDetailedTest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailedLoading, setDetailedLoading] = useState(false)

  const testEmailConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-email")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        status: "error",
        message: "Failed to test email configuration",
        details: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const getDebugInfo = async () => {
    try {
      const response = await fetch("/api/debug-email")
      const data = await response.json()
      setDebugInfo(data.debugInfo)
    } catch (error) {
      console.error("Failed to get debug info:", error)
    }
  }

  const runDetailedTest = async () => {
    setDetailedLoading(true)
    try {
      const response = await fetch("/api/test-email-detailed")
      const data = await response.json()
      setDetailedTest(data)
    } catch (error) {
      setDetailedTest({
        error: "Failed to run detailed test",
        details: error.message
      })
    } finally {
      setDetailedLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Email Configuration Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={testEmailConfig}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Testing..." : "Basic Test"}
          </button>

          <button
            onClick={runDetailedTest}
            disabled={detailedLoading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {detailedLoading ? "Testing..." : "Detailed Test"}
          </button>

          <button
            onClick={getDebugInfo}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Debug Info
          </button>
        </div>

        {status && (
          <div className={`mb-4 p-4 rounded-lg border ${
            status.status === "success" 
              ? "bg-green-100 border-green-500 text-green-700" 
              : "bg-red-100 border-red-500 text-red-700"
          }`}>
            <h3 className="font-semibold mb-2">Basic Test Results</h3>
            <p>{status.message}</p>
            {status.details && (
              <p className="text-sm opacity-75 mt-1">{status.details}</p>
            )}
            {status.email && (
              <p className="text-sm mt-2">Email: {status.email}</p>
            )}
          </div>
        )}

        {detailedTest && (
          <div className="mb-4 p-4 rounded-lg border border-blue-500 bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-700">Detailed Test Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Environment Check</h4>
                <div className="text-sm space-y-1">
                  <p><strong>EMAIL_USER:</strong> {detailedTest.envCheck?.emailUser}</p>
                  <p><strong>EMAIL_PASSWORD:</strong> {detailedTest.envCheck?.emailPassword}</p>
                  <p><strong>NEXT_PUBLIC_APP_URL:</strong> {detailedTest.envCheck?.appUrl}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">SMTP Test</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Connection:</strong> {detailedTest.smtpTest?.connection}</p>
                  <p><strong>Send Test:</strong> {detailedTest.smtpTest?.sendTest}</p>
                  {detailedTest.smtpTest?.email && (
                    <p><strong>Email:</strong> {detailedTest.smtpTest.email}</p>
                  )}
                </div>
              </div>
            </div>

            {detailedTest.recommendations && detailedTest.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Recommendations</h4>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {detailedTest.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {debugInfo && (
          <div className="mb-4 p-4 rounded-lg border border-blue-500 bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-700">Debug Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>EMAIL_USER:</strong> {debugInfo.emailUser}</p>
              <p><strong>EMAIL_PASSWORD:</strong> {debugInfo.emailPassword}</p>
              <p><strong>NEXT_PUBLIC_APP_URL:</strong> {debugInfo.appUrl}</p>
              <p><strong>NODE_ENV:</strong> {debugInfo.nodeEnv}</p>
            </div>
            {debugInfo.allEnvVars.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600">Related environment variables:</p>
                <p className="text-xs font-mono bg-gray-100 p-1 rounded">{debugInfo.allEnvVars.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Quick Fix Steps:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Make sure your Gmail account has 2-factor authentication enabled</li>
            <li>Generate an App Password for "Mail" in your Google Account settings</li>
            <li>Update the EMAIL_PASSWORD in your .env.local file with the App Password</li>
            <li>Restart your development server</li>
            <li>Run the detailed test above</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 font-medium">Common Issues:</p>
            <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-1">
              <li>Using regular Gmail password instead of App Password</li>
              <li>2-factor authentication not enabled on Gmail account</li>
              <li>App Password not generated for "Mail" application</li>
              <li>Environment variables not loaded (restart server after changes)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 