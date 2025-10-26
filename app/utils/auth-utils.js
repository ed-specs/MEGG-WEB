import { auth } from "../config/firebaseConfig"

/**
 * Get the current authenticated user
 * This function handles both Firebase Auth and custom auth sessions
 * @returns {Object|null} The current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  // First try Firebase Auth
  const firebaseUser = auth.currentUser
  if (firebaseUser) {
    return firebaseUser
  }

  // If no Firebase Auth user, check for custom auth
  const useCustomAuth = localStorage.getItem("useCustomAuth")
  if (useCustomAuth === "true") {
    const customAuthUser = localStorage.getItem("customAuthUser")
    if (customAuthUser) {
      try {
        const user = JSON.parse(customAuthUser)
        return user
      } catch (error) {
        console.error("Error parsing custom auth user:", error)
        // Clear invalid custom auth data
        localStorage.removeItem("customAuthUser")
        localStorage.removeItem("useCustomAuth")
        return null
      }
    }
  }

  return null
}

/**
 * Check if the current user is authenticated
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return getCurrentUser() !== null
}

/**
 * Get the current user's UID
 * @returns {string|null} The user's UID or null if not authenticated
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser()
  return user ? user.uid : null
}

/**
 * Sign out the current user (handles both Firebase Auth and custom auth)
 */
export const signOutUser = async () => {
  // Clear custom auth data
  localStorage.removeItem("customAuthUser")
  localStorage.removeItem("useCustomAuth")
  
  // Sign out from Firebase Auth if signed in
  if (auth.currentUser) {
    await auth.signOut()
  }
}

/**
 * Debug function to log current authentication state
 */
export const debugAuthState = () => {
  const firebaseUser = auth.currentUser
  const useCustomAuth = localStorage.getItem("useCustomAuth")
  const customAuthUser = localStorage.getItem("customAuthUser")
  
  console.log("=== Auth Debug Info ===")
  console.log("Firebase Auth User:", firebaseUser)
  console.log("Use Custom Auth:", useCustomAuth)
  console.log("Custom Auth User:", customAuthUser)
  console.log("getCurrentUser() result:", getCurrentUser())
  console.log("isAuthenticated() result:", isAuthenticated())
  console.log("getCurrentUserId() result:", getCurrentUserId())
  console.log("=========================")
}

/**
 * Get user information for debugging machine linking issues
 */
export const debugUserInfo = async () => {
  const user = getCurrentUser()
  if (!user) {
    console.log("No authenticated user found")
    return null
  }

  console.log("=== User Debug Info ===")
  console.log("User UID:", user.uid)
  console.log("User Email:", user.email)
  console.log("Is Custom Auth:", user.isCustomAuth)
  console.log("User Object:", user)
  console.log("========================")
  
  return user
} 