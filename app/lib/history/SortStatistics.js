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
      console.error("SortStatistics: No authenticated user found")
      return []
    }

    console.log("SortStatistics: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("SortStatistics: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("SortStatistics: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("SortStatistics: Error getting user's linked machines:", error)
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
 * Get weight logs only for machines linked to the current user within a time range
 * @param {string} timeFilter - Time filter (24h, 7d, 30d, 90d)
 * @returns {Promise<Array>} Array of weight logs for machines linked to the current user
 */
export const getMachineLinkedWeightLogs = async (timeFilter = "24h") => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("SortStatistics: No linked machines found for user")
      return []
    }

    const { start, end } = getDateRange(timeFilter)
    console.log("SortStatistics: Date range for", timeFilter, ":", start, "to", end)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const querySnapshot = await getDocs(q)
    
    console.log("SortStatistics: Found", querySnapshot.docs.length, "total weight log documents")
    
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

    console.log("SortStatistics: Filtered logs within time range:", logs.length)
    return logs
  } catch (error) {
    console.error("SortStatistics: Error fetching machine-linked weight logs:", error)
    return []
  }
}

/**
 * Calculate statistics only for machines linked to the current user
 * @param {string} timeFilter - Time filter (24h, 7d, 30d, 90d)
 * @returns {Promise<Object>} Statistics object
 */
export const calculateMachineLinkedSortStatistics = async (timeFilter = "24h") => {
  try {
    console.log("SortStatistics: Starting calculation for time filter:", timeFilter)
    
    // Get logs only for machines linked to the current user
    const logs = await getMachineLinkedWeightLogs(timeFilter)
    console.log("SortStatistics: Fetched machine-linked logs:", logs.length, "items")

    // Total sorts
    const totalSorts = logs.length

    // Map size values to readable format
    const sizeMapping = {
      'TOO_SMALL': 'Small',
      'SMALL': 'Small',
      'MEDIUM': 'Medium',
      'LARGE': 'Large',
      'EXTRA_LARGE': 'Large',
      'TOO_LARGE': 'Large',
      'JUMBO': 'Large',
      'DEFECT': 'Defect'
    }

    // Count size types
    const sizeCounts = logs.reduce((acc, log) => {
      const sizeType = sizeMapping[log.size] || log.size || "unknown"
      acc[sizeType] = (acc[sizeType] || 0) + 1
      return acc
    }, {})

    console.log("SortStatistics: Size counts:", sizeCounts)

    // Calculate percentages
    const sizePercentages = {}
    Object.keys(sizeCounts).forEach((type) => {
      sizePercentages[type] = totalSorts > 0 ? ((sizeCounts[type] / totalSorts) * 100).toFixed(1) : 0
    })

    // Find most common size
    let mostCommonSize = { type: "none", count: 0 }
    Object.keys(sizeCounts).forEach((type) => {
      if (sizeCounts[type] > mostCommonSize.count) {
        mostCommonSize = { type, count: sizeCounts[type] }
      }
    })

    // Calculate average weight
    const totalWeight = logs.reduce((sum, log) => sum + (log.weight || 0), 0)
    const averageWeight = totalSorts > 0 ? (totalWeight / totalSorts).toFixed(2) : 0

    // Calculate sort rate (per hour)
    let sortRate = 0
    if (logs.length > 0) {
      const { start, end } = getDateRange(timeFilter)
      const hoursDiff = (new Date(end) - new Date(start)) / (1000 * 60 * 60)
      sortRate = hoursDiff > 0 ? Math.round(totalSorts / hoursDiff) : 0
    }

    // Calculate trend (compared to previous period)
    const previousPeriod = await getMachineLinkedPreviousPeriodData(timeFilter)
    const sortTrend =
      previousPeriod.totalSorts > 0
        ? ((totalSorts - previousPeriod.totalSorts) / previousPeriod.totalSorts) * 100
        : totalSorts > 0
          ? 100
          : 0

    return {
      totalSorts,
      sizeCounts,
      sizePercentages,
      mostCommonSize: mostCommonSize.type !== "none" ? mostCommonSize : null,
      averageWeight,
      sortRate,
      sortTrend: sortTrend.toFixed(1),
      lastUpdated: new Date().toLocaleTimeString(),
    }
  } catch (error) {
    console.error("SortStatistics: Error calculating machine-linked sort statistics:", error)
    return {
      totalSorts: 0,
      sizeCounts: {},
      sizePercentages: {},
      mostCommonSize: null,
      averageWeight: 0,
      sortRate: 0,
      sortTrend: 0,
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
      return { totalSorts: 0 }
    }

    const { start, end } = getDateRange(timeFilter)
    const periodDuration = new Date(end) - new Date(start)

    const previousStart = new Date(new Date(start).getTime() - periodDuration)
    const previousEnd = new Date(new Date(end).getTime() - periodDuration)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const querySnapshot = await getDocs(q)
    let totalSorts = 0

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()

      // Only count logs within the previous time range
      if (timestamp >= previousStart && timestamp <= previousEnd) {
        totalSorts++
      }
    })

    return { totalSorts }
  } catch (error) {
    console.error("SortStatistics: Error fetching machine-linked previous period data:", error)
    return { totalSorts: 0 }
  }
}

