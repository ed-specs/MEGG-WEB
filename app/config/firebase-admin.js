import admin from "firebase-admin"

function initializeAdmin() {
  if (admin.apps.length) return

  let credential = null

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      if (json.private_key && typeof json.private_key === "string") {
        json.private_key = json.private_key.replace(/\\n/g, "\n")
      }
      credential = admin.credential.cert(json)
    } catch (e) {
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON: " + e.message)
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (privateKey && typeof privateKey === "string") {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }

    if (!projectId || !clientEmail || !privateKey) {
      return
    }
    credential = admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  if (!credential) return

  admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

export function getAdminServices() {
  initializeAdmin()
  if (!admin.apps.length) {
    throw new Error(
      "Firebase Admin not initialized. Provide FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    )
  }
  return { firestore: admin.firestore(), messaging: admin.messaging() }
}

export default admin