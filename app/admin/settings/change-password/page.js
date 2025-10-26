"use client"

import { useState } from "react"
import { Save, SaveOff, TriangleAlert } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { createNotification } from "../../../lib/notifications/NotificationsService"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Navbar } from "../../../components/NavBar"
import { Header } from "../../../components/Header"
import { getCurrentUser, debugUserInfo } from "../../../utils/auth-utils"
import bcrypt from "bcryptjs"

export default function ChangePasswordPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [globalMessage, setGlobalMessage] = useState("")
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const validate = (name, value) => {
    const validationErrors = { ...errors }

    if (name === "newPassword") {
      validationErrors.newPassword = value.length < 8 ? "Password must be at least 8 characters long." : ""
    }

    if (name === "confirmPassword") {
      validationErrors.confirmPassword = value !== formData.newPassword ? "Passwords do not match." : ""
    }

    setErrors(validationErrors)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData({ ...formData, [name]: value })
    validate(name, value)
  }

  // Function to check if notifications are enabled
  const areNotificationsEnabled = async (userId) => {
    try {
      const settingsRef = doc(db, "notificationSettings", userId)
      const settingsSnap = await getDoc(settingsRef)

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data()
        return settings.notificationsEnabled && settings.inAppNotifications
      }
      return false
    } catch (error) {
      console.error("Error checking notification settings:", error)
      return false
    }
  }

  // Function to create password change notification
  const createPasswordChangeNotification = async (userId) => {
    try {
      const notificationsEnabled = await areNotificationsEnabled(userId)
      if (notificationsEnabled) {
        await createNotification(userId, "Your password has been successfully updated.", "password_change")
      }
    } catch (error) {
      console.error("Error creating password change notification:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    const validationErrors = {}
    if (!formData.currentPassword) {
      validationErrors.currentPassword = "Current password is required"
    }
    if (!formData.newPassword) {
      validationErrors.newPassword = "New password is required"
    } else if (formData.newPassword.length < 8) {
      validationErrors.newPassword = "Password must be at least 8 characters long."
    }
    if (!formData.confirmPassword) {
      validationErrors.confirmPassword = "Confirm password is required"
    } else if (formData.confirmPassword !== formData.newPassword) {
      validationErrors.confirmPassword = "Passwords do not match."
    }

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length === 0) {
      setLoading(true)
      try {
        const user = getCurrentUser()

        if (!user || !user.email) {
          throw new Error("No authenticated user found")
        }

        // Debug user info before password change
        console.log("=== Password Change Debug ===")
        await debugUserInfo()
        console.log("=============================")

        // For custom auth users, update password in both Firestore and Firebase Auth
        if (user.isCustomAuth) {
          // Get the user document from Firestore
          const userRef = doc(db, "users", user.uid)
          const userSnap = await getDoc(userRef)

          if (!userSnap.exists()) {
            throw new Error("User document not found")
          }

          const userData = userSnap.data()

          // Verify current password
          const isCurrentPasswordValid = await bcrypt.compare(formData.currentPassword, userData.password)
          if (!isCurrentPasswordValid) {
            setErrors({ currentPassword: "Current password is incorrect" })
            setGlobalMessage("Failed to update password: Current password is incorrect")
            setLoading(false)
            return
          }

          // Hash the new password
          const saltRounds = 10
          const hashedNewPassword = await bcrypt.hash(formData.newPassword, saltRounds)

          // Update the password in Firestore
          await updateDoc(userRef, {
            password: hashedNewPassword,
            updatedAt: new Date(),
          })

          // Also try to update Firebase Auth password if the user exists there
          try {
            // Check if there's a Firebase Auth user with the same email
            const firebaseUser = auth.currentUser
            if (firebaseUser && firebaseUser.email === user.email) {
              // Create credentials with current password for reauthentication
              const credential = EmailAuthProvider.credential(user.email, formData.currentPassword)
              
              // Reauthenticate user
              await reauthenticateWithCredential(firebaseUser, credential)
              
              // Update Firebase Auth password
              await updatePassword(firebaseUser, formData.newPassword)
              console.log("Firebase Auth password updated successfully")
            }
          } catch (firebaseError) {
            console.log("Firebase Auth password update failed (this is okay for custom auth users):", firebaseError)
            // This is not a critical error for custom auth users
          }

          // Create notification for password change
          await createPasswordChangeNotification(user.uid)

          // Clear form
          setFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          })

          setGlobalMessage("Password updated successfully!")
        } else {
          // For Firebase Auth users, use the original flow
          if (auth.currentUser) {
            // Create credentials with current password
            const credential = EmailAuthProvider.credential(user.email, formData.currentPassword)

            // Reauthenticate user
            await reauthenticateWithCredential(auth.currentUser, credential)

            // Update password
            await updatePassword(auth.currentUser, formData.newPassword)

            // Create notification for password change
            await createPasswordChangeNotification(user.uid)

            // Clear form
            setFormData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            })

            setGlobalMessage("Password updated successfully!")
          }
        }
      } catch (error) {
        console.error("Error updating password:", error)

        // Handle specific Firebase errors
        if (error.code === "auth/wrong-password") {
          setErrors({ currentPassword: "Current password is incorrect" })
          setGlobalMessage("Failed to update password: Current password is incorrect")
        } else if (error.code === "auth/requires-recent-login") {
          setGlobalMessage("Please sign in again to change your password")
        } else {
          setGlobalMessage("Failed to update password. Please try again.")
        }
      } finally {
        setLoading(false)

        // Clear success message after 3 seconds
        if (!errors.currentPassword) {
          setTimeout(() => {
            setGlobalMessage("")
          }, 3000)
        }
      }
    }
  }

  const handleDiscard = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setErrors({})
    setGlobalMessage("")
  }

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            <div className="flex w-full bg-white p-6 rounded-2xl border justify-center border-gray-300 shadow">
              <div className="w-full max-w-lg flex flex-col py-2 gap-6">

                {/* validation/error message */}
                {globalMessage && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
                    globalMessage.includes("successful")
                      ? "bg-green-200 text-green-600"
                      : "bg-red-200 text-red-600"
                  }`}>
                    <TriangleAlert className="w-5 h-5" />
                    {globalMessage}
                  </div>
                )}

                {/* form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="currentPassword" className="text-gray-500">
                      Current password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      className="rounded-lg border px-4 py-2 border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                      placeholder="Enter your current password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                    />
                    {errors.currentPassword && <span className="text-red-500 text-sm">{errors.currentPassword}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="newPassword" className="text-gray-500">
                      New password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      className="rounded-lg border px-4 py-2 border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                      placeholder="Enter your new password"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                    {errors.newPassword && <span className="text-red-500 text-sm">{errors.newPassword}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="confirmPassword" className="text-gray-500">
                      Re-enter password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      className="rounded-lg border px-4 py-2 border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2">
                    <button 
                      type="button"
                      onClick={handleDiscard}
                      className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-gray-100 transition-colors duration-150 hover:bg-gray-200 flex items-center gap-2 cursor-pointer"
                    >
                      <SaveOff className="w-5 h-5" />
                      Discard
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-green-500 text-white transition-colors duration-150 hover:bg-green-600 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? "Updating..." : "Change password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

