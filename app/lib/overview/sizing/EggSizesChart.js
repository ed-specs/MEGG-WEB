import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"
import { getCurrentUser } from "../../../utils/auth-utils"

// Helpers
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date()
    if (typeof ts?.toDate === 'function') return ts.toDate()
    if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000)
    const d = new Date(ts)
    return isNaN(d) ? new Date() : d
  } catch {
    return new Date()
  }
}

const getCurrentAccountId = async () => {
  try {
    const user = getCurrentUser()
    if (!user) return null
    const ref = doc(db, "users", user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data()?.accountId || null
  } catch (e) {
    console.error("EggSizesChart: failed to get accountId", e)
    return null
  }
}

// Buckets we expose in the UI
const emptyBuckets = () => ({ large: 0, medium: 0, small: 0, defect: 0 })

// Get daily egg sizes data for linked machines
export const getMachineLinkedDailyEggSizes = async () => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // Get data for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(qBatches)
    const docs = snapshot.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Group by day and sum sizes
    const dailyData = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize all days with 0 counts for each size
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = dayNames[date.getDay()]
      dailyData[dayName] = emptyBuckets()
    }

    // Sum eggs for each day and bucket from batch stats
    docs.forEach(b => {
      const created = tsToDate(b?.createdAt)
      const dayName = dayNames[created.getDay()]
      const s = b?.stats || {}
      const add = {
        large: Number(s.largeEggs || 0),
        medium: Number(s.mediumEggs || 0),
        small: Number(s.smallEggs || 0),
        defect: Number((s.badEggs || 0) + (s.dirtyEggs || 0)),
      }
      const prev = dailyData[dayName] || emptyBuckets()
      dailyData[dayName] = {
        large: prev.large + add.large,
        medium: prev.medium + add.medium,
        small: prev.small + add.small,
        defect: prev.defect + add.defect,
      }
    })

    // Convert to array format
    const result = dayNames.map(day => ({
      day,
      large: dailyData[day]?.large || 0,
      medium: dailyData[day]?.medium || 0,
      small: dailyData[day]?.small || 0,
      defect: dailyData[day]?.defect || 0
    }))

    return result
  } catch (error) {
    console.error("Error getting daily egg sizes:", error)
    return []
  }
}

// Get monthly egg sizes data for linked machines
export const getMachineLinkedMonthlyEggSizes = async () => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // Get data for the last 6 months
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 6)

    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(qBatches)
    const docs = snapshot.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Group by month and sum sizes
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months with 0 counts for each size
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthName = monthNames[date.getMonth()]
      monthlyData[monthName] = emptyBuckets()
    }

    // Sum eggs for each month from batch stats
    docs.forEach(b => {
      const created = tsToDate(b?.createdAt)
      const monthName = monthNames[created.getMonth()]
      const s = b?.stats || {}
      const add = {
        large: Number(s.largeEggs || 0),
        medium: Number(s.mediumEggs || 0),
        small: Number(s.smallEggs || 0),
        defect: Number((s.badEggs || 0) + (s.dirtyEggs || 0)),
      }
      const prev = monthlyData[monthName] || emptyBuckets()
      monthlyData[monthName] = {
        large: prev.large + add.large,
        medium: prev.medium + add.medium,
        small: prev.small + add.small,
        defect: prev.defect + add.defect,
      }
    })

    // Convert to array format
    const result = Object.keys(monthlyData).map(month => ({
      month,
      large: monthlyData[month]?.large || 0,
      medium: monthlyData[month]?.medium || 0,
      small: monthlyData[month]?.small || 0,
      defect: monthlyData[month]?.defect || 0
    }))

    return result
  } catch (error) {
    console.error("Error getting monthly egg sizes:", error)
    return []
  }
}

