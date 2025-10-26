"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { db, auth } from "../../config/firebaseConfig.js"
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth"
import Image from "next/image"
import { generateOTP, calculateOTPExpiry } from "../../../app/utils/otp"
import { generateUniqueAccountId, checkAccountIdExists } from "../../../app/utils/accountId"
import { Mail } from "lucide-react"
import bcrypt from "bcryptjs"

// Function to encrypt credentials
const encryptCredentials = (username, password) => {
  return btoa(JSON.stringify({ username, password }))
}

// Function to decrypt credentials
const decryptCredentials = (encrypted) => {
  try {
    return JSON.parse(atob(encrypted))
  } catch {
    return null
  }
}

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

export default function LoginPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberedCredentials")
    if (savedCredentials) {
      const decrypted = decryptCredentials(savedCredentials)
      if (decrypted) {
        setForm((prev) => ({
          ...prev,
          username: decrypted.username,
          password: decrypted.password,
        }))
        setRememberMe(true)
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetFields = () => {
    setForm({
      username: "",
      password: "",
    })
    localStorage.removeItem("rememberedCredentials")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    if (!form.username || !form.password) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    try {
      // First, find user by username in Firestore
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("username", "==", form.username))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("Invalid username or password.")
        setIsLoading(false)
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      const userEmail = userData.email

      // Check if user has a hashed password in Firestore
      if (userData.password) {
        // Use bcrypt to compare passwords
        const isPasswordValid = await bcrypt.compare(form.password, userData.password)
        
        if (!isPasswordValid) {
          setGlobalMessage("Invalid username or password.")
          setIsLoading(false)
          return
        }

        // Password is valid, now try to sign in with Firebase Auth
        // If Firebase Auth fails, we'll still allow login since Firestore password is correct
        let firebaseUser = null
        try {
          const userCredential = await signInWithEmailAndPassword(auth, userEmail, form.password)
          firebaseUser = userCredential.user
        } catch (firebaseError) {
          console.log("Firebase Auth failed, but Firestore password is correct:", firebaseError)
          
          // Create a custom authentication session since Firebase Auth failed
          // This will allow the user to access the application
          const customAuthUser = {
            uid: userDoc.id,
            email: userEmail,
            displayName: userData.username,
            // Add a custom property to identify this as a custom auth session
            isCustomAuth: true
          }
          
          // Store the custom auth user in localStorage
          localStorage.setItem("customAuthUser", JSON.stringify(customAuthUser))
          
          // Set a flag to indicate we're using custom auth
          localStorage.setItem("useCustomAuth", "true")
          
          firebaseUser = customAuthUser
        }

        // Handle Remember Me
        if (rememberMe) {
          const encrypted = encryptCredentials(form.username, form.password)
          localStorage.setItem("rememberedCredentials", encrypted)
        } else {
          localStorage.removeItem("rememberedCredentials")
        }

        // Check if user is verified
        if (!userData.verified) {
          // Generate new OTP and expiry time
          const newOTP = generateOTP()
          const newExpiry = calculateOTPExpiry()

          // Update user document with new OTP
          await setDoc(
            doc(db, "users", userDoc.id),
            {
              verificationOTP: newOTP,
              otpExpiry: newExpiry,
            },
            { merge: true },
          )

          // Send verification email with OTP
          await sendVerificationEmail(userEmail, newOTP)

          setGlobalMessage("Please verify your email before logging in.")
          router.push(`/verify?email=${userEmail}`)
          setIsLoading(false)
          return
        }

        // Update last login
        await setDoc(
          doc(db, "users", userDoc.id),
          {
            lastLogin: new Date().toISOString(),
          },
          { merge: true },
        )

        setGlobalMessage("Login successful!")
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: firebaseUser?.uid || userDoc.id,
            email: userEmail,
            username: userData.username,
          }),
        )

        setTimeout(() => router.replace("/admin/overview"), 2000)
      } else {
        // Fallback to Firebase Auth if no hashed password exists
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, form.password)
        const user = userCredential.user

        // Handle Remember Me
        if (rememberMe) {
          const encrypted = encryptCredentials(form.username, form.password)
          localStorage.setItem("rememberedCredentials", encrypted)
        } else {
          localStorage.removeItem("rememberedCredentials")
        }

        // Check if user is verified
        if (!userData.verified) {
          // Generate new OTP and expiry time
          const newOTP = generateOTP()
          const newExpiry = calculateOTPExpiry()

          // Update user document with new OTP
          await setDoc(
            doc(db, "users", user.uid),
            {
              verificationOTP: newOTP,
              otpExpiry: newExpiry,
            },
            { merge: true },
          )

          // Send verification email with OTP
          await sendVerificationEmail(userEmail, newOTP)

          setGlobalMessage("Please verify your email before logging in.")
          router.push(`/verify?email=${userEmail}`)
          setIsLoading(false)
          return
        }

        // Update last login
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastLogin: new Date().toISOString(),
          },
          { merge: true },
        )

        setGlobalMessage("Login successful!")
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email: userEmail,
            username: userData.username,
          }),
        )

        setTimeout(() => router.replace("/admin/overview"), 2000)
      }
    } catch (error) {
      console.error("Login error:", error)
      let errorMessage = "Login failed. Please check your credentials."

      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid username or password."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later."
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled."
      }

      setGlobalMessage(errorMessage)
      resetFields()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user already exists and has an account ID
      const userDocRef = doc(db, "users", user.uid)
      const existingUserDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
      
      let accountId = null
      if (!existingUserDoc.empty) {
        // User exists, check if they have an account ID
        const userData = existingUserDoc.docs[0].data()
        accountId = userData.accountId || null
      }

      // Generate account ID if user doesn't have one
      if (!accountId) {
        accountId = await generateUniqueAccountId(db)
        console.log(`Generated new account ID for Google user: ${accountId}`)
      }

      // Create or update user document
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          accountId: accountId, // Add the account ID
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          provider: "google",
          verified: true, // Google accounts are pre-verified
          devicedId: user.uid,
        },
        { merge: true },
      )

      const userData = {
        uid: user.uid,
        username: user.displayName,
        email: user.email,
        accountId: accountId,
        deviceId: user.uid,
      }

      setGlobalMessage("Login successful!")
      localStorage.setItem("user", JSON.stringify(userData))
      setTimeout(() => router.replace("/admin/overview"), 2000)
    } catch (error) {
      console.error("Error signing in with Google:", error)
      if (error.code === "permission-denied") {
        setGlobalMessage("Access denied. Please check your permissions.")
      } else {
        setGlobalMessage("Google sign-in failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const viewRegister = () => {
    router.push("/register");
  };

  const viewForgotPassword = () => {
    router.push("/forgot-password")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white lg:bg-transparent">
      <div className="flex flex-col gap-8 w-full max-w-lg p-6 md:p-8 lg:bg-white lg:shadow lg:rounded-2xl lg:border lg:border-gray-300">
        {/* logo */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <Image src="/logo.png" alt="MEGG Logo" height={46} width={46} />

          <div className="flex flex-col text-center">
            <span className="text-2xl font-bold">
              Welcome to <span className="text-blue-900">MEGG</span>
            </span>
            <span className="text-gray-500">Sign in to your account</span>
          </div>
        </div>

        {/* validation */}
        {globalMessage && (
          <div className={`px-4 py-2 rounded-lg border-l-4 ${
            globalMessage.includes("successful") || globalMessage.includes("verified successfully")
              ? "bg-green-100 border-green-500 text-green-500"
              : "bg-red-100 border-red-500 text-red-500"
          }`}>
            {globalMessage}
          </div>
        )}

        {/* forms */}
        <div className="flex flex-col gap-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                name="username"
                id="username"
                value={form.username}
                className="border-b-2 border-gray-300 p-2 rounded- outline-none focus:border-blue-500 transition-colors duration-150"
                placeholder="Enter your username"
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                name="password"
                id="password"
                value={form.password}
                className="border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 transition-colors duration-150"
                placeholder="Enter your password"
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="rememberMe" 
                    id="rememberMe" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="rememberMe">Remember me</label>
                </div>
                <button 
                  type="button" 
                  onClick={viewForgotPassword} 
                  className="cursor-pointer text-gray-500 transition-colors duration-150 active:text-blue-500"
                >
                  Forgot password
                </button>
              </div>
            </div>
            <div className="mt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-pointer text-white w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="w-full flex items-center gap-4 my-4">
            <div className="flex-1 h-[1px] bg-gray-300"></div>
            <span className="text-gray-500 text-sm">Sign in with</span>
            <div className="flex-1 h-[1px] bg-gray-300"></div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="border border-gray-300 hover:bg-gray-100 transition-colors duration-150 cursor-pointer rounded-lg flex items-center justify-center px-4 py-2 gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  width="24px"
                  height="24px"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
              )}
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </button>
            <button
              onClick={viewRegister}
              className="border border-gray-300 hover:bg-gray-100 transition-colors duration-150 cursor-pointer rounded-lg flex items-center justify-center px-4 py-2 gap-2"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
