import QRCode from 'qrcode'

/**
 * Generate a QR code for machine linking
 * @param {string} machineId - The machine ID
 * @param {string} linkToken - The link token
 * @returns {Promise<string>} - Data URL of the QR code
 */
export async function generateMachineQRCode(machineId, linkToken) {
  try {
    const qrData = JSON.stringify({
      machineId,
      linkToken,
      timestamp: new Date().toISOString(),
      type: 'machine_link'
    })

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0e5f97',
        light: '#ffffff',
      },
    })

    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/**
 * Generate a test QR code with sample data
 * @returns {Promise<string>} - Data URL of the test QR code
 */
export async function generateTestQRCode() {
  const testMachineId = 'MEGG-2024-TEST-001'
  const testLinkToken = 'test-token-' + Date.now()
  
  return generateMachineQRCode(testMachineId, testLinkToken)
}

/**
 * Download QR code as image
 * @param {string} dataURL - The QR code data URL
 * @param {string} filename - The filename to save as
 */
export function downloadQRCode(dataURL, filename = 'machine-qr-code.png') {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
} 