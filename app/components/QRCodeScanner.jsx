"use client"

import React from "react"

export default function QRCodeScanner({ onQRCodeScanned, onClose, currentUser }) {
  const handleMockScan = () => {
    const machineData = { machineId: "TEST-123", scannedBy: currentUser?.uid || "anonymous" }
    const result = { text: "MOCK_QR_RESULT" }
    if (onQRCodeScanned) onQRCodeScanned(machineData, result)
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-700">QR scanner stub. Replace with real scanner implementation later.</p>
      <div className="flex gap-2">
        <button onClick={handleMockScan} className="bg-green-600 text-white px-4 py-2 rounded">
          Simulate Scan Success
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
          Close
        </button>
      </div>
    </div>
  )
}
