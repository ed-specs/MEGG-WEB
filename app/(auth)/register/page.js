"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth, db } from "../../config/firebaseConfig"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore"
import Image from "next/image"
import { generateOTP, calculateOTPExpiry } from "../../../app/utils/otp"
import { generateUniqueAccountId, checkAccountIdExists } from "../../../app/utils/accountId"

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullname: "",
    username: "",
    phone: "", 
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [accountId, setAccountId] = useState("")
  const [isGeneratingId, setIsGeneratingId] = useState(true)

  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Generate account ID when component mounts
  useEffect(() => {
    const generateId = async () => {
      try {
        setIsGeneratingId(true)
        const id = await generateUniqueAccountId(db)
        setAccountId(id)
      } catch (error) {
        console.error("Error generating account ID:", error)
        setGlobalMessage("Error generating account ID. Please refresh the page.")
      } finally {
        setIsGeneratingId(false)
      }
    }
    generateId()
  }, [])

  const sendVerificationEmail = async (email, otp) => {
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      })

      if (!response.ok) {
        throw new Error("Failed to send verification email")
      }
    } catch (error) {
      console.error("Error sending verification email:", error)
      throw error
    }
  }

  // Handle input changes and real-time validation
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    validateField(name, value)
  }

  const validateField = (name, value) => {
    let errorMsg = ""

    switch (name) {
      case "fullname":
        if (!value) errorMsg = "Full name is required."
        break
      case "username":
        if (!value) errorMsg = "Username is required."
        break
      case "email":
        if (!value) errorMsg = "Email is required."
        else if (!/\S+@\S+\.\S+/.test(value)) errorMsg = "Invalid email address."
        break
        case "phone":
        if (!value) errorMsg = "Phone number is required."
        else if (!/^\+?[\d\s-]{10,}$/.test(value)) errorMsg = "Please enter a valid phone number."
        break
      case "password":
        if (value.length < 8) errorMsg = "Password must be at least 8 characters."
        break
      case "confirmPassword":
        if (value !== form.password) errorMsg = "Passwords do not match."
        break
      default:
        break
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }))
  }
  

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    // Check for empty fields
    const emptyFields = Object.entries(form).filter(([key, value]) => value === "")
    if (emptyFields.length > 0) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    // Check if there are any remaining validation errors
    const hasErrors = Object.values(errors).some((error) => error !== "")
    if (hasErrors) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      // Check username availability
      const userRef = collection(db, "users")
      const usernameQuery = query(userRef, where("username", "==", form.username))

      try {
        const usernameSnapshot = await getDocs(usernameQuery)
        if (!usernameSnapshot.empty) {
          setGlobalMessage("Username already taken.")
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setGlobalMessage("Error checking username availability. Please try again.")
        setIsLoading(false)
        return
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)

      // Generate OTP and expiry time
      const otp = generateOTP()
      const otpExpiry = calculateOTPExpiry()

      // Update user profile
      await updateProfile(userCredential.user, {
        displayName: form.username,
      })

      // Store user data and OTP in Firestore
      try {
        // Final check to ensure account ID is still unique before saving
        const finalCheck = await checkAccountIdExists(accountId, db)
        if (finalCheck) {
          throw new Error("Account ID collision detected. Please try again.")
        }

        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullname: form.fullname,
          username: form.username,
          email: form.email,
          phone: form.phone,
          accountId: accountId, // Add the generated account ID
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          uid: userCredential.user.uid,
          verified: false,
          verificationOTP: otp,
          otpExpiry: otpExpiry,
          deviceId: auth.currentUser?.uid || "unknown", // Add device ID tracking
        })

     

        await sendVerificationEmail(form.email, otp)

        setGlobalMessage(`Account created successfully! Your Account ID is ${accountId}. Please check your email for verification.`)
        setTimeout(() => router.push(`/verify?email=${form.email}`), 3000)
      } catch (error) {
        console.error("Error saving user data:", error)
        // Clean up by deleting the auth user if Firestore save fails
        try {
          await userCredential.user.delete()
        } catch (deleteError) {
          console.error("Error deleting auth user:", deleteError)
        }
        throw new Error("Failed to save user data. Please try again.")
      }
    } catch (error) {
      let errorMessage = "Registration failed. Please try again."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already registered. Please use a different email."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address."
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password registration is not enabled."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak."
      }

      setGlobalMessage(errorMessage)
      console.error("Registration error:", error)
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
          <Image src="/Logos/logoblue.png" alt="MEGG Logo" height={46} width={46} />

          <div className="flex flex-col text-center">
            <span className="text-2xl font-bold">
              Welcome to <span className="text-blue-900">MEGG</span>
            </span>
            <span className="text-gray-500">Create your account</span>
          </div>
        </div>

        {/* validation */}
        {globalMessage && (
          <div className={`px-4 py-2 rounded-lg border-l-4 ${
            globalMessage.includes("successfully") || globalMessage.includes("Account created")
              ? "bg-green-100 border-green-500 text-green-500"
              : "bg-red-100 border-red-500 text-red-500"
          }`}>
            {globalMessage}
          </div>
        )}


        {/* forms */}
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1 flex flex-col gap-2">
              <label htmlFor="fullname">Fullname</label>
              <input
                type="text"
                name="fullname"
                id="fullname"
                className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150"
                placeholder="e.g. Juan Dela Cruz"
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.fullname && <span className="text-red-500 text-sm">{errors.fullname}</span>}
            </div>
            <div className="col-span-1 flex flex-col gap-2">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                name="username"
                id="username"
                className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150"
                placeholder="e.g. juandelacruz"
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150"
              placeholder="Enter your email address"
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="accountId">Account ID</label>
            <input
              type="text"
              name="accountId"
              id="accountId"
              className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150 font-mono"
              value={isGeneratingId ? "Generating..." : accountId || "Error generating ID"}
              disabled={true}
              readOnly
            />
            <span className="text-xs text-gray-500">This ID will be assigned to your account</span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="phone">Phone number</label>
            <input
              type="tel"
              name="phone"
              id="phone"
              className="border-b-2 border-gray-300 p-2 rounded outline-none focus:border-blue-500 transition-colors duration-150"
              placeholder="Enter your phone number"
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.phone && <span className="text-red-500 text-sm">{errors.phone}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              className="border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 transition-colors duration-150"
              placeholder="Enter your password"
              onChange={handleInputChange}
              disabled={isLoading}
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
              disabled={isLoading}
            />
            {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <button 
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-pointer text-white w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
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