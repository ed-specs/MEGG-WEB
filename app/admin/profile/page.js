"use client";

import { Navbar } from "../../components/NavBar";
import { Header } from "../../components/Header";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SaveOff, Trash2, UserPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../config/firebaseConfig";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { getCurrentUser } from "../../utils/auth-utils";

export default function ProfilePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          console.error("User document not found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const viewProfile = () => {
    router.push("/admin/settings/edit-profile");
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("No authenticated user.");
      
      // For custom auth users, we can't use Firebase Auth methods
      if (user.isCustomAuth) {
        // Delete Firestore user document
        await deleteDoc(doc(db, "users", user.uid));
        // Clear custom auth data
        localStorage.removeItem("customAuthUser");
        localStorage.removeItem("useCustomAuth");
        // Redirect to login
        router.push("/login");
        return;
      }
      
      // For Firebase Auth users, use the original flow
      if (auth.currentUser) {
        // Re-authenticate
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        // Delete Firestore user document
        await deleteDoc(doc(db, "users", user.uid));
        // Delete user from Auth
        await deleteUser(auth.currentUser);
        // Redirect to login
        router.push("/login");
      }
    } catch (error) {
      setDeleteError(error.message || "Failed to delete account.");
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading profile...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>No user data found.</span>
      </div>
    );
  }

  // Prepare fields for display
  const basicInfoItems = [
    { id: 1, label: "Fullname", value: userData.fullname || "-" },
    { id: 2, label: "Gender", value: userData.gender || "-" },
    { id: 3, label: "Birthday", value: userData.birthday || "-" },
    { id: 4, label: "Age", value: userData.age || "-" },
  ];

  const contactInfoItems = [
    { id: 1, label: "Email", value: userData.email || "-" },
    { id: 2, label: "Contact number", value: userData.phone || "-" },
    { id: 3, label: "Residential address", value: userData.address || "-" },
  ];

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
                {/* top  */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* left */}
                  <div className="flex flex-col md:flex-row gap-2 items-center md:gap-5">
                    <div className="relative rounded-full w-26 h-26 lg:w-20 lg:h-20 border border-blue-500 overflow-hidden">
                      <Image
                        src={userData.profileImageUrl || "/default.png"}
                        alt="Profile"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>

                    {/*  */}
                    <div className="flex flex-col text-center md:text-start gap-1">
                      <span className="text-xl font-medium">
                        {userData.fullname || "-"}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {userData.email || "-"}
                      </span>
                    </div>
                  </div>
                  {/* right */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={viewProfile}
                      className="rounded-full px-4 py-2 transition-colors duration-150 flex items-center gap-2 bg-gray-100 hover:bg-blue-500 hover:text-white cursor-pointer"
                    >
                      <UserPen className="w-5 h-5" />
                      Edit profile
                    </button>
                  </div>
                </div>
                {/* basic info */}
                <div className="flex flex-col gap-2">
                  <span className="font-medium">Basic information</span>

                  <div className="grid grid-cols-2 gap-4">
                    {basicInfoItems.map(({ id, label, value }) => (
                      <div
                        key={id}
                        className="col-span-2 md:col-span-1 rounded-lg border border-gray-300 p-4 flex flex-col transition-colors duration-150 hover:border-blue-500"
                      >
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* contact */}
                <div className="flex flex-col gap-2">
                  <span className="font-medium">Contact information</span>

                  <div className="grid grid-cols-2 gap-4">
                    {contactInfoItems.map(({ id, label, value }) => (
                      <div
                        key={id}
                        className={`col-span-2 ${label === "Residential address" ? "md:col-span-2" : "md:col-span-1"} rounded-lg border border-gray-300 p-4 flex flex-col transition-colors duration-150 hover:border-blue-500`}
                      >
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-500 px-4 py-2 rounded-full flex items-center gap-2 transition-colors duration-150 hover:bg-red-600 cursor-pointer text-white"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* delete modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 min-h-screen flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs transition-opacity duration-200 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md relative flex flex-col gap-6 transform transition-all duration-200">
              {/* title */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center p-2 rounded-full bg-red-500">
                  <Trash2 className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-bold text-center text-red-600">
                  Delete account
                </span>
              </div>

              {/* validation message (hidden for now) */}
              {deleteError && (
                <div className="bg-red-200 w-full flex text-red-600 items-center gap-2 rounded-lg px-4 py-2">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-center">
                <span className="text-gray-500 text-center">
                  <span className="font-bold">Warning:</span> Deleting your
                  account is permanent and cannot be undone.
                </span>
              </div>

              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="delete-password">Enter your password to delete account</label>
                  <input
                    type="password"
                    id="delete-password"
                    className="rounded-lg px-4 py-2 border border-gray-300 outline-none transition-colors duration-150 focus:border-red-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="bg-gray-100 px-4 py-2 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2 hover:bg-gray-200"
                    disabled={deleteLoading}
                  >
                    <SaveOff className="w-5 h-5" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-red-500 w-full text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2 hover:bg-red-600"
                    disabled={deleteLoading}
                  >
                    <Trash2 className="w-5 h-5" />
                    {deleteLoading ? "Deleting..." : "Delete account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}