"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs } from "firebase/firestore"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e) => {
    setEmail(e.target.value)
    validateField(e.target.value)
  }

  const validateField = (value) => {
    let errorMsg = ""

    if (!value) {
      errorMsg = "Email is required."
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      errorMsg = "Invalid email address."
    }
    setErrors({ email: errorMsg })
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    if (!email) {
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
      // Check if user exists first
      const userRef = collection(db, "users")
      const userQuery = query(userRef, where("email", "==", email))
      const userSnap = await getDocs(userQuery)

      if (userSnap.empty) {
        setGlobalMessage("No account found with this email address.")
        setIsLoading(false)
        return
      }

      // Send reset email
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes
        switch (data.code) {
          case "EMAIL_NOT_CONFIGURED":
            throw new Error("Email service is not configured. Please contact support.")
          case "APP_URL_NOT_CONFIGURED":
            throw new Error("Server configuration error. Please contact support.")
          case "SMTP_CONNECTION_FAILED":
            throw new Error("Email service connection failed. Please try again later.")
          case "EMAIL_SERVICE_UNAVAILABLE":
            throw new Error("Email service is temporarily unavailable. Please try again later.")
          case "permission-denied":
            throw new Error("Access denied. Please try again later.")
          default:
            throw new Error(data.error || "Failed to send reset email")
        }
      }

      setGlobalMessage("Password reset instructions sent to your email.")
      setTimeout(() => router.push("/login"), 4000)
    } catch (err) {
      console.error("Reset password error:", err)
      setGlobalMessage(err.message || "An error occurred. Please try again.")
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
            <span className="text-2xl font-bold">Forgot password</span>
            <span className="text-gray-500">
              Enter the email address you used to register with
            </span>
          </div>
        </div>

        {/* validation */}
        {globalMessage && (
          <div
            className={`px-4 py-2 rounded-lg border-l-4 ${
              globalMessage.includes("sent to your email")
                ? "bg-green-100 border-green-500 text-green-500"
                : "bg-red-100 border-red-500 text-red-500"
            }`}
          >
            {globalMessage}
          </div>
        )}

        {/* forms */}
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150"
              placeholder="Enter your email address"
              value={email}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-pointer text-white w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send reset link"}
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

