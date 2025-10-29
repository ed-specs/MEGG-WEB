"use client"

import { useState, useEffect } from "react"
import { Upload, Trash2, Save, SaveOff, TriangleAlert } from "lucide-react"
import Image from "next/image"
import { db, auth, storage } from "../../../config/firebaseConfig"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { onAuthStateChanged } from "firebase/auth"
import { trackProfileChanges } from "../../../lib/notifications/ProfileChangeTracker"
import { Navbar } from "../../../components/NavBar"
import { Header } from "../../../components/Header"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "../../../utils/auth-utils"

export default function EditProfile() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [profileImage, setProfileImage] = useState("/default.png")
  const [previewImage, setPreviewImage] = useState(null)
  const [globalMessage, setGlobalMessage] = useState("")
  const [userData, setUserData] = useState({
    fullname: "",
    birthday: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    profileImageUrl: "",
  })
  const [loading, setLoading] = useState(true)
  const [originalUserData, setOriginalUserData] = useState({})
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = getCurrentUser()
        if (!user) {
          router.push("/login")
          return
        }

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          const userDataObj = {
            fullname: data.fullname || "",
            birthday: data.birthday || "",
            age: data.age || "",
            gender: data.gender || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            profileImageUrl: data.profileImageUrl || "",
          }

          setUserData(userDataObj)
          setOriginalUserData(userDataObj) // Store original data for change tracking
          setProfileImage(data.profileImageUrl || "/default.png")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setGlobalMessage("Error loading profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // Cleanup preview URL on component unmount
  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  const calculateAge = (birthdate) => {
    const today = new Date()
    const birthDate = new Date(birthdate)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--
    }

    return age
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleBirthdayChange = (e) => {
    const value = e.target.value
    const computedAge = calculateAge(value)
    
    setUserData((prev) => ({
      ...prev,
      birthday: value,
      age: computedAge.toString(),
    }))
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Check file size (5MB limit)
    const fileSize = file.size / 1024 / 1024 // Convert to MB
    if (fileSize > 5) {
      setGlobalMessage("Image size must not exceed 5MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setGlobalMessage("Please select a valid image file")
      return
    }

    // Create preview URL for immediate display
    const previewURL = URL.createObjectURL(file)
    setPreviewImage(previewURL)

    try {
      const user = getCurrentUser()
      if (!user) {
        setGlobalMessage("Please log in to upload an image")
        return
      }

      // Store original data for change tracking
      const oldData = { ...userData }

      // Create a reference to the storage location
      const storageRef = ref(storage, `profile-images/${user.uid}`)

      // Upload the file
      await uploadBytes(storageRef, file)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update the user document with the new image URL
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        profileImageUrl: downloadURL,
      })

      // Update state
      setProfileImage(downloadURL)
      setUserData((prev) => ({
        ...prev,
        profileImageUrl: downloadURL,
      }))

      // Clear preview image since we now have the real URL
      setPreviewImage(null)
      URL.revokeObjectURL(previewURL)

      // Track changes and create notifications
      const newData = { ...userData, profileImageUrl: downloadURL }
      await trackProfileChanges(user.uid, oldData, newData)

      setGlobalMessage("Profile image updated successfully!")
    } catch (error) {
      console.error("Error uploading image:", error)
      setGlobalMessage("Error uploading image")
      
      // Clear preview on error
      setPreviewImage(null)
      URL.revokeObjectURL(previewURL)
    }

    setTimeout(() => {
      setGlobalMessage("")
    }, 3000)
  }

  const handleImageRemove = async () => {
    try {
      const user = getCurrentUser()
      if (!user) {
        setGlobalMessage("Please log in to remove the image")
        return
      }

      // Store original data for change tracking
      const oldData = { ...userData }

      // Delete the image from storage if it exists
      if (userData.profileImageUrl) {
        const storageRef = ref(storage, `profile-images/${user.uid}`)
        await deleteObject(storageRef)
      }

      // Update the user document
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        profileImageUrl: "",
      })

      // Update state
      setProfileImage("/default.png")
      setPreviewImage(null)
      setUserData((prev) => ({
        ...prev,
        profileImageUrl: "",
      }))

      // Track changes and create notifications
      const newData = { ...userData, profileImageUrl: "" }
      await trackProfileChanges(user.uid, oldData, newData)

      setGlobalMessage("Profile image removed successfully!")
    } catch (error) {
      console.error("Error removing image:", error)
      setGlobalMessage("Error removing image")
    }

    setTimeout(() => {
      setGlobalMessage("")
    }, 3000)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const user = getCurrentUser()
      if (!user) {
        setGlobalMessage("Please log in to save changes")
        return
      }

      const oldData = { ...originalUserData }
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, userData)
      await trackProfileChanges(user.uid, oldData, userData)
      setOriginalUserData({ ...userData })
      setGlobalMessage("Profile updated successfully!")
      // Redirect to profile after save
      router.push("/admin/profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      setGlobalMessage("Error updating profile")
    }

    setTimeout(() => {
      setGlobalMessage("")
    }, 3000)
  }

  const handleDiscard = () => {
    setUserData({ ...originalUserData })
    setProfileImage(originalUserData.profileImageUrl || "/default.png")
    setPreviewImage(null)
    setGlobalMessage("Changes discarded")
    
    setTimeout(() => {
      setGlobalMessage("")
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading profile...</span>
      </div>
    )
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
              <div className="w-full max-w-2xl flex flex-col gap-6 py-2">
                {/* Show success or error message */}
                {globalMessage && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-2 mb-4 ${
                    globalMessage.includes("success")
                      ? "bg-green-200 text-green-600"
                      : "bg-red-200 text-red-600"
                  }`}>
                    <TriangleAlert className="w-5 h-5" />
                    {globalMessage}
                  </div>
                )}
                {/* top  */}
                <div className="flex flex-col items-center gap-2 mb-6">
                  <div className="relative rounded-full w-28 h-28 border-4 border-blue-200 overflow-hidden mb-2">
                    <Image
                      src={previewImage || (profileImage === "/default.png" ? "/default.png" : profileImage)}
                      alt="Profile"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="flex gap-2 mb-1">
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-500 bg-white hover:bg-red-100 transition-colors duration-150"
                    >
                      <Trash2 className="w-5 h-5" /> Remove
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white cursor-pointer hover:bg-blue-600 transition-colors duration-150">
                      <Upload className="w-5 h-5" /> Upload
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  <span className="text-gray-500 text-xs font-semibold">
                    Note: <span className="font-normal">Image must not exceed 5MB.</span>
                  </span>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                  {/* Basic Information */}
                  <div>
                    <span className="font-semibold text-base mb-2 block">Basic information</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fullname */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Fullname</label>
                        <input
                          type="text"
                          name="fullname"
                          value={userData.fullname}
                          onChange={handleInputChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                          placeholder="Enter your fullname"
                        />
                      </div>
                      {/* Gender */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Gender</label>
                        <select
                          name="gender"
                          value={userData.gender}
                          onChange={handleInputChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                        >
                          <option value="">-- Select a gender --</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      {/* Birthday */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Birthday</label>
                        <input
                          type="date"
                          name="birthday"
                          value={userData.birthday}
                          onChange={handleBirthdayChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                        />
                      </div>
                      {/* Age */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Age</label>
                        <input
                          type="text"
                          name="age"
                          value={userData.age}
                          readOnly
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Contact Information */}
                  <div>
                    <span className="font-semibold text-base mb-2 block">Contact information</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={userData.email}
                          onChange={handleInputChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                          placeholder="Enter your email"
                        />
                      </div>
                      {/* Phone */}
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Contact number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={userData.phone}
                          onChange={handleInputChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      {/* Address (full width) */}
                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-gray-500 text-sm">Residential address</label>
                        <input
                          type="text"
                          name="address"
                          value={userData.address}
                          onChange={handleInputChange}
                          className="px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-150 outline-none focus:border-blue-500"
                          placeholder="Enter your address"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 mt-4">
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
                      className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-green-500 text-white transition-colors duration-150 hover:bg-green-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-5 h-5" />
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Optional Footer */}
      {/* <footer className="w-full text-center text-gray-400 py-4 text-sm mt-auto">
        &copy; {new Date().getFullYear()} MEGG. All rights reserved.
      </footer> */}
    </div>
  )
}
