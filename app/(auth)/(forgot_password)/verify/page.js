"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { TriangleAlert } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { generateOTP, calculateOTPExpiry } from "../../../utils/otp"
import { sendEmailVerification } from "firebase/auth"

export default function VerifyPage() {
  const [otp, setOtp] = useState(new Array(6).fill(""))
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes in seconds
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) {
      router.push("/login")
      return
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, router])

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/\D/, "") // Only allow digits
    if (!value) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input if not the last
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        // Go back
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    setGlobalMessage("")

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("User not found.")
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Generate new OTP and expiry
      const newOTP = generateOTP()
      const newExpiry = calculateOTPExpiry()

      // Update user document with new OTP
      await updateDoc(doc(db, "users", userDoc.id), {
        verificationOTP: newOTP,
        otpExpiry: newExpiry,
      })

      // Send new verification email
      if (auth.currentUser) {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify?email=${email}`,
          handleCodeInApp: true,
        }
        await sendEmailVerification(auth.currentUser, actionCodeSettings)
      }

      setGlobalMessage("New verification code sent!")
      setTimeLeft(900) // Reset timer to 15 minutes
    } catch (error) {
      console.error("Error resending OTP:", error)
      setGlobalMessage("Failed to resend verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    const enteredOTP = otp.join("")

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("User not found.")
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Check if OTP is expired
      if (new Date() > new Date(userData.otpExpiry)) {
        setGlobalMessage("Verification code has expired. Please request a new one.")
        return
      }

      // Verify OTP
      if (enteredOTP !== userData.verificationOTP) {
        setGlobalMessage("Invalid verification code. Please try again.")
        return
      }

      // Update user verification status
      await updateDoc(doc(db, "users", userDoc.id), {
        verified: true,
        verificationOTP: null,
        otpExpiry: null,
      })

      setGlobalMessage("Email verified successfully!")
      setTimeout(() => router.push("/login"), 2000)
    } catch (error) {
      console.error("Verification error:", error)
      setGlobalMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const viewSignIn = () => {
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white lg:bg-transparent">
      <div className="flex flex-col gap-10 w-full max-w-lg p-6 md:p-8 lg:bg-white lg:shadow lg:rounded-2xl lg:border lg:border-gray-300">
        {/* logo */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <Image src="/Logos/logoblue.png" alt="MEGG Logo" height={46} width={46} />
          <div className="flex flex-col text-center">
            <span className="text-2xl font-bold">Verify your email</span>
            <span className="text-gray-500">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-black">{email || "name@example.com"}</span>
            </span>
          </div>
        </div>

        {/* validation */}
        {globalMessage && (
          <div className={`flex px-4 py-2 rounded-lg border-l-4 ${
            globalMessage.includes("success")
              ? "bg-green-100 border-green-500 text-green-500"
              : "bg-red-100 border-red-500 text-red-500"
          }`}>
            <TriangleAlert className="w-5 h-5" />
            <span className="ml-2">{globalMessage}</span>
          </div>
        )}

        {/* forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-6 gap-2 place-items-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                inputMode="numeric"
                disabled={isLoading}
                className="w-12 h-12 text-center border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100 text-lg"
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Time remaining:</span>
              <span className="text-lg font-medium">{formatTime(timeLeft)}</span>
            </div>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isLoading || timeLeft > 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Resend code"}
            </button>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <button
              type="submit"
              disabled={isLoading || timeLeft === 0}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-pointer text-white w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify email"}
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

