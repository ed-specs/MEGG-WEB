"use client"

import { useState, useEffect } from "react"
import { generateTestQRCode, downloadQRCode } from "../utils/qr-generator"
import QRCodeScanner from "../components/QRCodeScanner"
import { getAuth, onAuthStateChanged } from "firebase/auth"

export default function TestQRPage() {
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Get current user from Firebase
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        })
      } else {
        setCurrentUser(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const generateQRCode = async () => {
    try {
      setIsGenerating(true)
      const dataURL = await generateTestQRCode()
      setQrCodeDataURL(dataURL)
    } catch (error) {
      console.error("Error generating QR code:", error)
      alert("Failed to generate QR code")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (qrCodeDataURL) {
      downloadQRCode(qrCodeDataURL, 'test-machine-qr.png')
    }
  }

  const handleQRCodeScanned = (machineData, result) => {
    console.log("QR Code scanned successfully:", machineData, result)
    alert(`Machine linked successfully! Machine ID: ${machineData.machineId}`)
    setShowScanner(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">QR Code Testing</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* QR Code Generation */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Generate Test QR Code</h2>
            <p className="text-gray-600 mb-4">
              Generate a test QR code that can be used to test the scanning functionality.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={generateQRCode}
                disabled={isGenerating}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isGenerating ? "Generating..." : "Generate Test QR Code"}
              </button>
              
              {qrCodeDataURL && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={qrCodeDataURL} 
                      alt="Test QR Code" 
                      className="border rounded"
                    />
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                  >
                    Download QR Code
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Scanner */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test QR Code Scanner</h2>
            <p className="text-gray-600 mb-4">
              Test the QR code scanner by scanning a generated QR code.
            </p>
            
            <button
              onClick={() => setShowScanner(true)}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
            >
              Open QR Scanner
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Generate a test QR code using the button above</li>
            <li>Download the QR code image</li>
            <li>Open the QR scanner</li>
            <li>Either scan the QR code with your camera or upload the downloaded image</li>
            <li>The scanner should detect the QR code and attempt to link the machine</li>
          </ol>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">QR Code Scanner</h2>
                <button
                  onClick={() => setShowScanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <QRCodeScanner
                onQRCodeScanned={handleQRCodeScanned}
                onClose={() => setShowScanner(false)}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 