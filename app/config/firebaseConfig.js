// Add the getApps and getMessaging imports
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCLPbkZawJ6PubRUmswjbDNgsQJSzo-Wq8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "megg-tech.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "megg-tech",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "megg-tech.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "733167941133",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:733167941133:web:e5a1a8edc9aee56b9dc744",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-H6HZSKD90P",
}

// Initialize Firebase only if it hasn't been initialized already
let app
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Auth with app config
export const auth = getAuth(app)

// Initialize Firestore and Storage
export const db = getFirestore(app)
export { collection, getDocs, query, where, orderBy, limit }
export const storage = getStorage(app)

// Initialize messaging conditionally (only in browser environment)
let messaging = null
export const initializeMessaging = async () => {
  if (typeof window !== "undefined" && !messaging) {
    try {
      const { getMessaging } = await import("firebase/messaging")
      messaging = getMessaging(app)
    } catch (error) {
      console.error("Error initializing messaging:", error)
    }
  }
  return messaging
}

export { app }

