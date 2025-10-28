import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"
import { getCurrentUser } from "../../../utils/auth-utils"

// Helpers
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date()
    if (typeof ts?.toDate === "function") return ts.toDate()
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000)
    const d = new Date(ts)
    return isNaN(d) ? new Date() : d
  } catch {
    return new Date()
  }
}

const getCurrentAccountId = async () => {
  try {
    const user = getCurrentUser()
    if (!user) {
      console.log("No authenticated user found")
      return null
    }

    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)
    if (!userDoc.exists()) return null
    const data = userDoc.data()
    return data?.accountId || null
  } catch (error) {
    console.error("Error getting accountId:", error)
    return null
  }
}

// Get daily total eggs data for linked machines
export const getMachineLinkedDailyTotalEggs = async () => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // Get data for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const batchesQ = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(batchesQ)
    const docs = snapshot.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Group by day and sum total eggs
    const dailyData = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = dayNames[date.getDay()]
      dailyData[dayName] = 0
    }

    // Sum eggs (non-defect only) for each day
    docs.forEach(b => {
      const created = tsToDate(b?.createdAt)
      const dayName = dayNames[created.getDay()]
      const stats = b?.stats || {}
      const good = typeof stats.goodEggs === 'number'
        ? Number(stats.goodEggs)
        : Number((stats.smallEggs||0) + (stats.mediumEggs||0) + (stats.largeEggs||0))
      const total = good
      dailyData[dayName] = (dailyData[dayName] || 0) + total
    })

    // Convert to array format
    const result = dayNames.map(day => ({
      day,
      eggs: dailyData[day] || 0
    }))

    return result
  } catch (error) {
    console.error("Error getting daily total eggs:", error)
    return []
  }
}

// Get monthly total eggs data for linked machines
export const getMachineLinkedMonthlyTotalEggs = async () => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // Get data for the last 6 months
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 6)

    const batchesQ = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(batchesQ)
    const docs = snapshot.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Group by month and sum total eggs
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months with 0
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthName = monthNames[date.getMonth()]
      monthlyData[monthName] = 0
    }

    // Sum eggs (non-defect only) for each month
    docs.forEach(b => {
      const created = tsToDate(b?.createdAt)
      const monthName = monthNames[created.getMonth()]
      const stats = b?.stats || {}
      const good = typeof stats.goodEggs === 'number'
        ? Number(stats.goodEggs)
        : Number((stats.smallEggs||0) + (stats.mediumEggs||0) + (stats.largeEggs||0))
      const total = good
      monthlyData[monthName] = (monthlyData[monthName] || 0) + total
    })

    // Convert to array format
    const result = Object.keys(monthlyData).map(month => ({
      month,
      eggs: monthlyData[month] || 0
    }))

    return result
  } catch (error) {
    console.error("Error getting monthly total eggs:", error)
    return []
  }
}









