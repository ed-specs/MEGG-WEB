import { collection, query, getDocs, where, orderBy, Timestamp, doc, getDoc, limit } from "firebase/firestore"
import { db } from "../../config/firebaseConfig"
import { getCurrentUser } from "../../utils/auth-utils"

/**
 * Get the current user's linked machines
 * @returns {Promise<string[]>} Array of machine IDs linked to the current user
 */
export const getUserLinkedMachines = async () => {
  try {
    // Get current user using our unified auth utility
    const user = getCurrentUser()
    if (!user) {
      console.error("DailySummary: No authenticated user found")
      return []
    }

    console.log("DailySummary: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("DailySummary: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("DailySummary: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("DailySummary: Error getting user's linked machines:", error)
    return []
  }
}

/**
 * Get defects for the current day only for machines linked to the current user
 * @returns {Promise<Array>} Array of defects for the current day
 */
export async function getMachineLinkedTodayDefects() {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("DailySummary: No linked machines found for user")
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startTimestamp = Timestamp.fromDate(today)
    const endTimestamp = Timestamp.fromDate(tomorrow)

    console.log("DailySummary: Querying today's defects for machines:", linkedMachines)

    // Modified approach: First query by timestamp range only
    const q = query(
      collection(db, "defect_logs"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp")
    )

    const querySnapshot = await getDocs(q)
    console.log("DailySummary: Found", querySnapshot.docs.length, "total defect logs for today")
    
    // Then filter the results in memory for the linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("DailySummary: Filtered to", filteredResults.length, "defects for linked machines")
    return filteredResults
  } catch (error) {
    console.error("DailySummary: Error fetching machine-linked today defects:", error)
    return []
  }
}

/**
 * Get defects for the previous day only for machines linked to the current user
 * @returns {Promise<Array>} Array of defects for the previous day
 */
export async function getMachineLinkedPreviousDayDefects() {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("DailySummary: No linked machines found for user")
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const startTimestamp = Timestamp.fromDate(yesterday)
    const endTimestamp = Timestamp.fromDate(today)

    console.log("DailySummary: Querying yesterday's defects for machines:", linkedMachines)

    // Modified approach: First query by timestamp range only
    const q = query(
      collection(db, "defect_logs"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp")
    )

    const querySnapshot = await getDocs(q)
    console.log("DailySummary: Found", querySnapshot.docs.length, "total defect logs for yesterday")
    
    // Then filter the results in memory for the linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("DailySummary: Filtered to", filteredResults.length, "defects for linked machines")
    return filteredResults
  } catch (error) {
    console.error("DailySummary: Error fetching machine-linked previous day defects:", error)
    return []
  }
}

/**
 * Get defects for the last 7 days only for machines linked to the current user
 * @returns {Promise<Array>} Array of defects for the last 7 days
 */
export async function getMachineLinkedWeekDefects() {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("DailySummary: No linked machines found for user")
      return []
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const startTimestamp = Timestamp.fromDate(weekAgo)
    const endTimestamp = Timestamp.fromDate(today)

    console.log("DailySummary: Querying week's defects for machines:", linkedMachines)

    // Modified approach: First query by timestamp range only
    const q = query(
      collection(db, "defect_logs"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp),
      orderBy("timestamp")
    )

    const querySnapshot = await getDocs(q)
    console.log("DailySummary: Found", querySnapshot.docs.length, "total defect logs for the week")
    
    // Then filter the results in memory for the linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("DailySummary: Filtered to", filteredResults.length, "defects for linked machines")
    return filteredResults
  } catch (error) {
    console.error("DailySummary: Error fetching machine-linked week defects:", error)
    return []
  }
}

// Calculate daily average
export function calculateDailyAverage(defects) {
  if (!defects.length) return 0

  // Group defects by day
  const defectsByDay = {}
  defects.forEach((defect) => {
    const date = defect.timestamp.toDateString()
    if (!defectsByDay[date]) {
      defectsByDay[date] = []
    }
    defectsByDay[date].push(defect)
  })

  // Calculate average
  const totalDays = Object.keys(defectsByDay).length
  const totalDefects = defects.length

  return totalDefects / totalDays
}

// Find peak time
export function findPeakTime(defects) {
  if (!defects.length) return "N/A"

  // Group defects by hour
  const defectsByHour = {}
  for (let i = 0; i < 24; i++) {
    defectsByHour[i] = 0
  }

  defects.forEach((defect) => {
    const hour = defect.timestamp.getHours()
    defectsByHour[hour]++
  })

  // Find peak hour
  let peakHour = 0
  let maxDefects = 0

  for (let hour = 0; hour < 24; hour++) {
    if (defectsByHour[hour] > maxDefects) {
      maxDefects = defectsByHour[hour]
      peakHour = hour
    }
  }

  // Format peak time
  const peakHourEnd = (peakHour + 2) % 24
  const formatHour = (h) => {
    const period = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour} ${period}`
  }

  return `${formatHour(peakHour)}-${formatHour(peakHourEnd)}`
}

// Get hourly distribution for chart
export function getHourlyDistribution(defects) {
  // Initialize hours
  const hourlyData = {}
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { hour: i, total: 0, dirty: 0, cracked: 0, good: 0 }
  }

  // Count defects by hour and type
  defects.forEach((defect) => {
    const hour = defect.timestamp.getHours()
    hourlyData[hour].total++

    if (defect.defect_type === "dirty") {
      hourlyData[hour].dirty++
    } else if (defect.defect_type === "cracked") {
      hourlyData[hour].cracked++
    } else if (defect.defect_type === "good") {
      hourlyData[hour].good++
    }
  })

  // Convert to array and format for chart
  return Object.values(hourlyData).map((hourData) => {
    const formattedHour = new Date(2023, 0, 1, hourData.hour).toLocaleTimeString([], {
      hour: "numeric",
      hour12: true,
    })

    return {
      hour: formattedHour,
      total: hourData.total,
      dirty: hourData.dirty,
      cracked: hourData.cracked,
      good: hourData.good,
    }
  })
}

// Get defect counts by type
export function getDefectCounts(defects) {
  const counts = {
    dirty: 0,
    cracked: 0,
    good: 0,
  }

  defects.forEach((defect) => {
    if (defect.defect_type === "dirty") {
      counts.dirty++
    } else if (defect.defect_type === "cracked") {
      counts.cracked++
    } else if (defect.defect_type === "good") {
      counts.good++
    }
  })

  return counts
}

// Calculate percentage change
export function calculatePercentageChange(current, previous) {
  if (previous === 0) return "Infinity"
  return (((current - previous) / previous) * 100).toFixed(1)
}