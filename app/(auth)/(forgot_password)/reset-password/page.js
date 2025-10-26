"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { db, auth } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from "firebase/auth"
import Image from "next/image"
import { verifyResetToken } from "../../../utils/token"
import bcrypt from "bcryptjs"

export default function PasswordPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userId, setUserId] = useState("")
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  // Determine if this is forgot password or reset password flow
  useEffect(() => {
    if (!token && !email) {
      setIsForgotPassword(true)
    } else {
      setIsForgotPassword(false)
      verifyToken()
    }
  }, [token, email])

  // Verify the reset token when component mounts
  const verifyToken = async () => {
    if (!token || !email) {
      setGlobalMessage("Invalid reset link. Please request a new one.")
      setTimeout(() => router.push("/forgot-password"), 3000)
      return
    }

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("Invalid reset link. Please request a new one.")
        setTimeout(() => router.push("/forgot-password"), 3000)
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Check if token is expired
      if (new Date() > new Date(userData.resetPasswordExpiry)) {
        setGlobalMessage("Reset link has expired. Please request a new one.")
        setTimeout(() => router.push("/forgot-password"), 3000)
        return
      }

      // Verify token
      const isValid = verifyResetToken(token, userData.resetPasswordToken)
      if (!isValid) {
        setGlobalMessage("Invalid reset link. Please request a new one.")
        setTimeout(() => router.push("/forgot-password"), 3000)
        return
      }

      setIsValidToken(true)
      setUserEmail(email)
      setUserId(userDoc.id)
    } catch (error) {
      console.error("Error verifying token:", error)
      setGlobalMessage("An error occurred. Please try again.")
      setTimeout(() => router.push("/forgot-password"), 3000)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    validateField(name, value)
  }

  const validateField = (name, value) => {
    let errorMsg = ""

    switch (name) {
      case "email":
        if (!value) {
          errorMsg = "Email is required."
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errorMsg = "Please enter a valid email address."
        }
        break
      case "password":
        if (value.length < 8) {
          errorMsg = "Password must be at least 8 characters."
        } else if (!/\d/.test(value)) {
          errorMsg = "Password must contain at least one number."
        } else if (!/[a-z]/.test(value)) {
          errorMsg = "Password must contain at least one lowercase letter."
        } else if (!/[A-Z]/.test(value)) {
          errorMsg = "Password must contain at least one uppercase letter."
        } else if (!/[!@#$%^&*]/.test(value)) {
          errorMsg = "Password must contain at least one special character (!@#$%^&*)."
        }
        break
      case "confirmPassword":
        if (value !== form.password) errorMsg = "Passwords do not match."
        break
      default:
        break
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }))
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    if (!form.email) {
      setGlobalMessage("Please enter your email address.")
      setIsLoading(false)
      return
    }

    if (errors.email) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      // Use Firebase's built-in password reset
      await sendPasswordResetEmail(auth, form.email)
      setGlobalMessage("Password reset link sent to your email! Please check your inbox.")
    } catch (error) {
      console.error("Forgot password error:", error)
      let errorMessage = "An error occurred while sending the reset link."

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later."
      }

      setGlobalMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    if (!form.password || !form.confirmPassword) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    const hasErrors = Object.values(errors).some((error) => error !== "")
    if (hasErrors) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      if (!isValidToken || !userEmail || !userId) {
        throw new Error("Invalid reset token")
      }

      // Hash the password for Firestore
      const hashedPassword = await bcrypt.hash(form.password, 12)

      // Update password in Firestore
      await updateDoc(doc(db, "users", userId), {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        passwordUpdatedAt: new Date().toISOString(),
      })

      // Try to update Firebase Auth password if user is currently signed in
      try {
        if (auth.currentUser && auth.currentUser.email === userEmail) {
          await updatePassword(auth.currentUser, form.password)
        }
      } catch (firebaseError) {
        console.log("Could not update Firebase Auth password:", firebaseError)
        // This is expected if user is not authenticated
      }

      setGlobalMessage("Password updated successfully! You can now login with your username and new password.")

      // Sign out any existing user session
      if (auth.currentUser) {
        await auth.signOut()
      }

      setTimeout(() => router.push("/login"), 3000)
    } catch (error) {
      console.error("Reset password error:", error)
      let errorMessage = "An error occurred while resetting your password."

      if (error.message === "Invalid reset token") {
        errorMessage = "Invalid reset link. Please request a new one."
        setTimeout(() => router.push("/forgot-password"), 3000)
      } else if (error.code === "permission-denied") {
        errorMessage = "Access denied. Please try again or contact support."
      }

      setGlobalMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const viewSignIn = () => {
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white lg:bg-transparent">
      <div className="flex flex-col gap-10 w-full max-w-lg p-6 md:p-8 lg:bg-white lg:shadow lg:rounded-2xl lg:border lg:border-gray-300">
        {/* logo */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <Image src="/logo.png" alt="MEGG Logo" height={46} width={46} />

          <div className="flex flex-col text-center">
            <span className="text-2xl font-bold">
              {isForgotPassword ? "Forgot password" : "Reset password"}
            </span>
            <span className="text-gray-500">
              {isForgotPassword 
                ? "Enter the email address you used to register with"
                : "Your new password must be different to previous password."
              }
            </span>
          </div>
        </div>

        {/* validation */}
        {globalMessage && (
          <div className={`px-4 py-2 rounded-lg border-l-4 ${
            globalMessage.includes("successfully") || globalMessage.includes("sent")
              ? "bg-green-100 border-green-500 text-green-500"
              : "bg-red-100 border-red-500 text-red-500"
          }`}>
            {globalMessage}
          </div>
        )}

        {/* forms */}
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleResetPassword} className="flex flex-col gap-4">
          {isForgotPassword ? (
            // Forgot Password Form
            <div className="flex flex-col gap-2">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                className="border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 transition-colors duration-150"
                placeholder="Enter your email address"
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
            </div>
          ) : (
            // Reset Password Form
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="password">New password</label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  className="border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 transition-colors duration-150"
                  placeholder="Enter your password"
                  onChange={handleInputChange}
                  disabled={isLoading || !isValidToken}
                />
                {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  className="border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 transition-colors duration-150"
                  placeholder="Re-enter your password"
                  onChange={handleInputChange}
                  disabled={isLoading || !isValidToken}
                />
                {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
              </div>
            </>
          )}
          
          <div className="flex flex-col gap-4 mt-4">
            <button 
              type="submit"
              disabled={isLoading || (!isForgotPassword && !isValidToken)}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-pointer text-white w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? (isForgotPassword ? "Sending..." : "Resetting Password...") 
                : (isForgotPassword ? "Send reset link" : "Change password")
              }
            </button>

            <button
              type="button"
              onClick={viewSignIn}
              className="border border-gray-300 hover:bg-gray-100 transition-colors duration-150 cursor-pointer rounded-lg flex items-center justify-center px-4 py-2 gap-2"
            >
              Go back to Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

