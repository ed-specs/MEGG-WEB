import { collection, getDocs, query, where, doc, getDoc, orderBy } from "firebase/firestore"
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
      console.error("SortDailySummary: No authenticated user found")
      return []
    }

    console.log("SortDailySummary: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("SortDailySummary: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("SortDailySummary: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("SortDailySummary: Error getting user's linked machines:", error)
    return []
  }
}

/**
 * Get today's weight logs only for machines linked to the current user
 * @returns {Promise<Array>} Array of today's weight logs for machines linked to the current user
 */
export async function getMachineLinkedTodaySorts() {
  try {
    const linkedMachines = await getUserLinkedMachines()
    if (linkedMachines.length === 0) {
      console.log("SortDailySummary: No linked machines found for user")
      return []
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    console.log("SortDailySummary: Querying today's sorts for machines:", linkedMachines)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(
      weightLogsRef,
      where("timestamp", ">=", startOfDay),
      where("timestamp", "<", endOfDay),
      orderBy("timestamp")
    )
    const querySnapshot = await getDocs(q)
    
    console.log("SortDailySummary: Found", querySnapshot.docs.length, "total weight logs for today")

    // Filter by linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("SortDailySummary: Filtered to", filteredResults.length, "sorts for linked machines")
    return filteredResults
  } catch (error) {
    console.error("SortDailySummary: Error fetching machine-linked today sorts:", error)
    return []
  }
}

/**
 * Get yesterday's weight logs only for machines linked to the current user
 * @returns {Promise<Array>} Array of yesterday's weight logs for machines linked to the current user
 */
export async function getMachineLinkedPreviousDaySorts() {
  try {
    const linkedMachines = await getUserLinkedMachines()
    if (linkedMachines.length === 0) {
      console.log("SortDailySummary: No linked machines found for user")
      return []
    }

    // Get yesterday's date range
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

    console.log("SortDailySummary: Querying yesterday's sorts for machines:", linkedMachines)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(
      weightLogsRef,
      where("timestamp", ">=", startOfDay),
      where("timestamp", "<", endOfDay),
      orderBy("timestamp")
    )
    const querySnapshot = await getDocs(q)
    
    console.log("SortDailySummary: Found", querySnapshot.docs.length, "total weight logs for yesterday")

    // Filter by linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("SortDailySummary: Filtered to", filteredResults.length, "sorts for linked machines")
    return filteredResults
  } catch (error) {
    console.error("SortDailySummary: Error fetching machine-linked previous day sorts:", error)
    return []
  }
}

/**
 * Get last 7 days weight logs only for machines linked to the current user
 * @returns {Promise<Array>} Array of last 7 days weight logs for machines linked to the current user
 */
export async function getMachineLinkedWeekSorts() {
  try {
    const linkedMachines = await getUserLinkedMachines()
    if (linkedMachines.length === 0) {
      console.log("SortDailySummary: No linked machines found for user")
      return []
    }

    // Get last 7 days date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    console.log("SortDailySummary: Querying last 7 days sorts for machines:", linkedMachines)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(
      weightLogsRef,
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp")
    )
    const querySnapshot = await getDocs(q)
    
    console.log("SortDailySummary: Found", querySnapshot.docs.length, "total weight logs for last 7 days")

    // Filter by linked machines
    const filteredResults = querySnapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }))

    console.log("SortDailySummary: Filtered to", filteredResults.length, "sorts for linked machines")
    return filteredResults
  } catch (error) {
    console.error("SortDailySummary: Error fetching machine-linked week sorts:", error)
    return []
  }
}

/**
 * Calculate daily average from weight logs
 * @param {Array} logs - Array of weight logs
 * @returns {number} Daily average
 */
export function calculateDailyAverage(logs) {
  if (!logs || logs.length === 0) return 0

  // Group logs by date
  const dailyCounts = {}
  logs.forEach((log) => {
    // Handle both Date objects and Firestore timestamps
    const timestamp = log.timestamp && typeof log.timestamp.toDate === 'function' 
      ? log.timestamp.toDate() 
      : log.timestamp
    const date = timestamp.toDateString()
    dailyCounts[date] = (dailyCounts[date] || 0) + 1
  })

  // Calculate average
  const days = Object.keys(dailyCounts).length
  const totalSorts = logs.length
  return days > 0 ? totalSorts / days : 0
}

/**
 * Find peak time from weight logs
 * @param {Array} logs - Array of weight logs
 * @returns {string} Peak time period
 */
export function findPeakTime(logs) {
  if (!logs || logs.length === 0) return "N/A"

  // Group logs by hour
  const hourlyCounts = {}
  logs.forEach((log) => {
    // Handle both Date objects and Firestore timestamps
    const timestamp = log.timestamp && typeof log.timestamp.toDate === 'function' 
      ? log.timestamp.toDate() 
      : log.timestamp
    const hour = timestamp.getHours()
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
  })

  // Find hour with maximum count
  let maxHour = 0
  let maxCount = 0
  Object.keys(hourlyCounts).forEach((hour) => {
    if (hourlyCounts[hour] > maxCount) {
      maxCount = hourlyCounts[hour]
      maxHour = parseInt(hour)
    }
  })

  // Convert to time period
  if (maxHour === 0) return "12-1 AM"
  if (maxHour < 12) return `${maxHour}-${maxHour + 1} AM`
  if (maxHour === 12) return "12-1 PM"
  return `${maxHour - 12}-${maxHour - 11} PM`
}

/**
 * Calculate hourly distribution from weight logs
 * @param {Array} logs - Array of weight logs
 * @returns {Object} Hourly distribution
 */
export function calculateHourlyDistribution(logs) {
  if (!logs || logs.length === 0) return {}

  const hourlyCounts = {}
  logs.forEach((log) => {
    // Handle both Date objects and Firestore timestamps
    const timestamp = log.timestamp && typeof log.timestamp.toDate === 'function' 
      ? log.timestamp.toDate() 
      : log.timestamp
    const hour = timestamp.getHours()
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
  })

  return hourlyCounts
}

/**
 * Calculate size counts from weight logs
 * @param {Array} logs - Array of weight logs
 * @returns {Object} Size counts
 */
export function calculateSizeCounts(logs) {
  if (!logs || logs.length === 0) return {}

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

  const sizeCounts = {}
  logs.forEach((log) => {
    const sizeType = sizeMapping[log.size] || log.size || "unknown"
    sizeCounts[sizeType] = (sizeCounts[sizeType] || 0) + 1
  })

  return sizeCounts
}

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
