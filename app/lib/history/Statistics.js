import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
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
      console.error("Statistics: No authenticated user found")
      return []
    }

    console.log("Statistics: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("Statistics: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("Statistics: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("Statistics: Error getting user's linked machines:", error)
    return []
  }
}

// Get date range based on time filter
const getDateRange = (filter) => {
  const now = new Date()
  const end = now
  let start

  switch (filter) {
    case "24h":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Get defect logs only for machines linked to the current user within a time range
 * @param {string} timeFilter - Time filter (24h, 7d, 30d, 90d)
 * @returns {Promise<Array>} Array of defect logs for machines linked to the current user
 */
export const getMachineLinkedDefectLogs = async (timeFilter = "24h") => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("Statistics: No linked machines found for user")
      return []
    }

    const { start, end } = getDateRange(timeFilter)
    console.log("Statistics: Date range for", timeFilter, ":", start, "to", end)

    // Query defect logs where machine_id is in the user's linked machines
    const defectLogsRef = collection(db, "defect_logs")
    const q = query(defectLogsRef, where("machine_id", "in", linkedMachines))
    const querySnapshot = await getDocs(q)
    
    console.log("Statistics: Found", querySnapshot.docs.length, "total defect log documents")
    
    const logs = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Parse the timestamp string to a Date object
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()

      // Only include logs within the time range
      if (timestamp >= new Date(start) && timestamp <= new Date(end)) {
        logs.push({
          id: doc.id,
          ...data,
          timestamp: timestamp,
        })
      }
    })

    console.log("Statistics: Filtered logs within time range:", logs.length)
    return logs
  } catch (error) {
    console.error("Statistics: Error fetching machine-linked defect logs:", error)
    return []
  }
}

/**
 * Calculate statistics only for machines linked to the current user
 * @param {string} timeFilter - Time filter (24h, 7d, 30d, 90d)
 * @returns {Promise<Object>} Statistics object
 */
export const calculateMachineLinkedStatistics = async (timeFilter = "24h") => {
  try {
    console.log("Statistics: Starting calculation for time filter:", timeFilter)
    
    // Get logs only for machines linked to the current user
    const logs = await getMachineLinkedDefectLogs(timeFilter)
    console.log("Statistics: Fetched machine-linked logs:", logs.length, "items")

    // Total inspections
    const totalInspections = logs.length

    // Count defect types
    const defectCounts = logs.reduce((acc, log) => {
      const defectType = log.defect_type || "unknown"
      acc[defectType] = (acc[defectType] || 0) + 1
      return acc
    }, {})

    console.log("Statistics: Defect counts:", defectCounts)

    // Calculate percentages
    const defectPercentages = {}
    Object.keys(defectCounts).forEach((type) => {
      defectPercentages[type] = totalInspections > 0 ? ((defectCounts[type] / totalInspections) * 100).toFixed(1) : 0
    })

    // Find most common defect
    let mostCommonDefect = { type: "none", count: 0 }
    Object.keys(defectCounts).forEach((type) => {
      if (type !== "good" && defectCounts[type] > mostCommonDefect.count) {
        mostCommonDefect = { type, count: defectCounts[type] }
      }
    })

    // If no defects other than "good" are found, use the most frequent type
    if (mostCommonDefect.type === "none" && Object.keys(defectCounts).length > 0) {
      Object.keys(defectCounts).forEach((type) => {
        if (defectCounts[type] > mostCommonDefect.count) {
          mostCommonDefect = { type, count: defectCounts[type] }
        }
      })
    }

    // Calculate inspection rate (per hour)
    let inspectionRate = 0
    if (logs.length > 0) {
      const { start, end } = getDateRange(timeFilter)
      const hoursDiff = (new Date(end) - new Date(start)) / (1000 * 60 * 60)
      inspectionRate = hoursDiff > 0 ? Math.round(totalInspections / hoursDiff) : 0
    }

    // Calculate trend (compared to previous period)
    const previousPeriod = await getMachineLinkedPreviousPeriodData(timeFilter)
    const inspectionTrend =
      previousPeriod.totalInspections > 0
        ? ((totalInspections - previousPeriod.totalInspections) / previousPeriod.totalInspections) * 100
        : totalInspections > 0
          ? 100
          : 0

    return {
      totalInspections,
      defectCounts,
      defectPercentages,
      mostCommonDefect: mostCommonDefect.type !== "none" ? mostCommonDefect : null,
      inspectionRate,
      inspectionTrend: inspectionTrend.toFixed(1),
      lastUpdated: new Date().toLocaleTimeString(),
    }
  } catch (error) {
    console.error("Error calculating machine-linked statistics:", error)
    return {
      totalInspections: 0,
      defectCounts: {},
      defectPercentages: {},
      mostCommonDefect: null,
      inspectionRate: 0,
      inspectionTrend: 0,
      lastUpdated: new Date().toLocaleTimeString(),
    }
  }
}

/**
 * Get previous period data only for machines linked to the current user
 * @param {string} timeFilter - Time filter (24h, 7d, 30d, 90d)
 * @returns {Promise<Object>} Previous period data
 */
const getMachineLinkedPreviousPeriodData = async (timeFilter) => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return { totalInspections: 0 }
    }

    const { start, end } = getDateRange(timeFilter)
    const periodDuration = new Date(end) - new Date(start)

    const previousStart = new Date(new Date(start).getTime() - periodDuration)
    const previousEnd = new Date(new Date(end).getTime() - periodDuration)

    // Query defect logs where machine_id is in the user's linked machines
    const defectLogsRef = collection(db, "defect_logs")
    const q = query(defectLogsRef, where("machine_id", "in", linkedMachines))
    const querySnapshot = await getDocs(q)
    let totalInspections = 0

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()

      // Only count logs within the previous time range
      if (timestamp >= previousStart && timestamp <= previousEnd) {
        totalInspections++
      }
    })

    return { totalInspections }
  } catch (error) {
    console.error("Error fetching machine-linked previous period data:", error)
    return { totalInspections: 0 }
  }
}