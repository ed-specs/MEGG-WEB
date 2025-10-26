"use client";
import { Bell, Menu, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "../config/firebaseConfig.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
// import { signOut } from "firebase/auth";

export  function Header({ setSidebarOpen }) {
  const pathname = usePathname();
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    profileImageUrl: "",
  });
  const router = useRouter();

  const viewProfile = () => {
    router.push("/admin/profile");
  };

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(
    false
  );
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Function to fetch user data
    const fetchUserData = async (userId) => {
      try {
        // Real-time user data listener
        const userDocRef = doc(db, "users", userId);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              username: data.username || "User",
              email: data.email || "",
              profileImageUrl: data.profileImageUrl || "/default.png",
            });
          } else {
            // Handle case where user document doesn't exist
            setUserData({
              username: "User",
              email: "",
              profileImageUrl: "/default.png",
            });
          }
        });

        // Real-time notifications listener
        const notificationsRef = collection(db, "notifications");
        const q = query(notificationsRef, where("userId", "==", userId));
        const unsubscribeNotif = onSnapshot(q, (querySnapshot) => {
          const fetchedNotifications = [];
          querySnapshot.forEach((doc) => {
            fetchedNotifications.push({ id: doc.id, ...doc.data() });
          });
          setNotifications(fetchedNotifications);
        });

        // Return cleanup functions
        return { unsubscribeUser, unsubscribeNotif };
      } catch (error) {
        console.error("Error setting up real-time listeners:", error);
        return { unsubscribeUser: null, unsubscribeNotif: null };
      }
    };

    // Function to check for custom auth user
    const checkCustomAuth = async () => {
      const useCustomAuth = localStorage.getItem("useCustomAuth");
      if (useCustomAuth === "true") {
        const customAuthUser = localStorage.getItem("customAuthUser");
        if (customAuthUser) {
          try {
            const user = JSON.parse(customAuthUser);
            setUserId(user.uid);
            return await fetchUserData(user.uid);
          } catch (error) {
            console.error("Error parsing custom auth user:", error);
            // Clear invalid custom auth data
            localStorage.removeItem("customAuthUser");
            localStorage.removeItem("useCustomAuth");
          }
        }
      }
      return { unsubscribeUser: null, unsubscribeNotif: null };
    };

    let unsubscribeNotif = null;
    let unsubscribeUser = null;

    // Listen for Firebase Auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      // Clean up previous listeners
      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeUser) unsubscribeUser();

      if (user) {
        setUserId(user.uid);
        const cleanup = await fetchUserData(user.uid);
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      } else {
        // Check for custom auth user
        const cleanup = await checkCustomAuth();
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      }
    });

    // Initial check for custom auth
    checkCustomAuth().then((cleanup) => {
      if (!auth.currentUser) {
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeUser) unsubscribeUser();
      unsubscribeAuth();
    };
  }, []);

  // Mark all as read function
  const markAllAsRead = async () => {
    if (!userId || notifications.length === 0) return;
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((notif) =>
          updateDoc(doc(db, "notifications", notif.id), { read: true })
        )
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Delete notification function
  const deleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Unread count for badge
  const unreadCount = notifications.filter((n) => !n.read).length;

  const pageName =
    {
      "/admin/overview": "Dashboard",
      "/admin/inventory": "Inventory",
      "/admin/history/sort": "Sort History",
      "/admin/history/defect": "Defect History",
      "/admin/profile": "Profile",
      "/admin/settings/edit-profile": "Edit Profile",
      "/admin/settings/change-password": "Change Password",
      "/admin/settings/preferences": "Preferences",
    }[pathname] || "Page";
  return (
    <div className="">
      {/* Header */}
      <div className="relative flex items-center justify-between bg-white p-4 md:p-6 rounded-2xl border border-gray-300 shadow">
        {/* left */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors duration-150 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl  font-bold">{pageName}</span>
        </div>

        {/* right */}
        <div className=" flex items-center gap-2 md:gap-">
          {/* notification */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationDropdown((prev) => !prev)}
              className={`p-2 rounded-full transition-colors duration-150 cursor-pointer ${
                showNotificationDropdown
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "hover:bg-gray-100"
              }`}
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 z-10">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* notification */}
            {showNotificationDropdown && (
              <>
                {/* Backdrop for mobile modal effect */}
                <div className="fixed inset-0 bg-black bg-opacity-20 z-30 sm:hidden"></div>
                <div
                  className="
                    fixed top-0 left-0 w-screen h-screen z-40 flex items-start justify-center pt-6
                    sm:absolute sm:top-auto sm:left-auto sm:w-96 sm:h-auto sm:pt-0 sm:right-0 sm:translate-x-0
                  "
                >
                  <div className="rounded-2xl bg-white border border-gray-300 flex flex-col overflow-hidden shadow-lg w-[95vw] max-w-md sm:w-96">
                    {/* header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Notifications</span>
                        {unreadCount > 0 && (
                          <div className="bg-red-500 rounded-full text-xs text-white px-2.5 py-1 flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-gray-500 transition-colors duration-150 hover:text-blue-500 cursor-pointer text-sm"
                          onClick={markAllAsRead}
                        >
                          Mark all as read
                        </button>
                        {/* Mobile close button */}
                        <button
                          className="sm:hidden p-1 text-gray-500 transition-colors duration-150 hover:text-gray-700 cursor-pointer"
                          onClick={() => setShowNotificationDropdown(false)}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {/* content */}
                    <div className="flex flex-col max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">No notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer transition-colors duration-150 hover:bg-gray-100 border-b border-gray-300"
                            role="button"
                            tabIndex={0}
                          >
                            {/* image */}
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              <Image
                                src={notif.profileImage || "/default.png"}
                                alt="Profile"
                                width={48}
                                height={48}
                                className="rounded-full object-cover"
                              />
                            </div>
                            {/* description */}
                            <div className="flex flex-col text-start">
                              <span className="font-bold">
                                {notif.message}
                              </span>
                              <span className="text-xs text-gray-400 mt-1">
                                {notif.createdAt && notif.createdAt.seconds
                                  ? new Date(notif.createdAt.seconds * 1000).toLocaleString()
                                  : notif.createdAt || ""}
                              </span>
                            </div>
                            <button
                              className="ml-auto p-2 text-gray-400 hover:text-red-600"
                              title="Delete notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {/* see all button */}
                    <div className="flex items-center justify-center p-3 sm:p-4 border-t border-gray-200 sticky bottom-0 bg-white">
                      <button className="text-center cursor-pointer text-gray-500 transition-colors duration-150 hover:text-blue-500">
                        See all notifications
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* profile */}
          <button
            onClick={viewProfile}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            {/* image */}
            {userData?.profileImageUrl ? (
              <Image
                src={userData.profileImageUrl}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <Image
                src="/default.png"
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            )}
            <div className="hidden md:flex flex-col text-start">
              <h1 className="font-medium text-sm">{userData.username}</h1>
              <span className="text-sm text-gray-500">
                {userData.email}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export const exportDefectLogs = (data, format) => {
  console.log("Exporting defect logs, data:", data);
  if (!data || data.length === 0) {
    console.warn('No defect logs to export')
    return
  }
  // ...rest of the code
}

const testData = [{
  batch_id: "O1V9BTlsimw36q5cXRx",
  confidence_score: 0.95,
  defect_type: "good",
  image_id: "1741185281151.jpg",
  machine_id: "MEGG-2025-089-367",
  timestamp: "2025-03-05T14:34:41.695Z"
}];
exportDefectLogs(testData, "csv");
