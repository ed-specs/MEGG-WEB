import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  onSnapshot,
} from "firebase/firestore"
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
      console.error("No authenticated user found")
      return []
    }

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("User document not found")
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("Error getting user's linked machines:", error)
    return []
  }
}

// Format date for display
const formatDate = (timestamp) => {
  if (!timestamp) return ""

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)

  // Format date as MM/DD/YYYY
  const shortDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

  // Format time as HH:MM:SS AM/PM
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const ampm = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
  const time = `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm}`

  // Format full date for display
  const fullDate = `${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)} ${time}`

  return {
    shortDate,
    time,
    fullDate,
  }
}

/**
 * Get batches only for machines linked to the current user with pagination
 * @param {number} pageSize - Number of batches to fetch per page
 * @param {object} lastVisible - Last document from previous query for pagination
 * @returns {Promise<{batches: Array, lastVisibleDoc: object}>} Batches and last visible document
 */
export const getMachineLinkedBatches = async (pageSize = 6, lastVisible = null) => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return { batches: [], lastVisibleDoc: null }
    }

    let batchesQuery

    if (lastVisible) {
      batchesQuery = query(
        collection(db, "batches"),
        where("machine_id", "in", linkedMachines),
        orderBy("created_at", "desc"),
        startAfter(lastVisible),
        limit(pageSize),
      )
    } else {
      batchesQuery = query(
        collection(db, "batches"),
        where("machine_id", "in", linkedMachines),
        orderBy("created_at", "desc"),
        limit(pageSize)
      )
    }

    const batchesSnapshot = await getDocs(batchesQuery)
    const lastVisibleDoc = batchesSnapshot.docs[batchesSnapshot.docs.length - 1]

    const batches = batchesSnapshot.docs.map((doc) => {
      const data = doc.data()
      const created = formatDate(data.created_at)
      const updated = formatDate(data.updated_at)

      // Calculate the primary defect type
      const defectCounts = data.defect_counts || {}
      let primaryDefectType = "None"
      let maxCount = 0

      Object.entries(defectCounts).forEach(([type, count]) => {
        if (type !== "good" && count > maxCount) {
          maxCount = count
          primaryDefectType = type.charAt(0).toUpperCase() + type.slice(1)
        }
      })

      // Calculate confidence (mock calculation - adjust as needed)
      const totalDefects = Object.values(defectCounts).reduce((sum, count) => sum + count, 0)
      const confidence = totalDefects > 0 ? Math.round((maxCount / totalDefects) * 100 * 10) / 10 : 0

      return {
        id: doc.id,
        batchNumber: data.batch_number,
        timestamp: created.shortDate,
        time: created.time,
        defectType: primaryDefectType,
        confidence: confidence,
        totalDefects: data.total_count || 0,
        uniqueDefectTypes: Object.keys(defectCounts).filter((key) => key !== "good" && defectCounts[key] > 0).length,
        timeRange: `${created.time} - ${updated.time}`,
        fromDate: created.fullDate,
        toDate: updated.fullDate,
        machineId: data.machine_id,
        status: data.status,
        defectCounts: data.defect_counts,
        rawData: data,
      }
    })

    return { batches, lastVisibleDoc }
  } catch (error) {
    console.error("Error getting machine-linked batches:", error)
    return { batches: [], lastVisibleDoc: null }
  }
}

/**
 * Get total number of batches only for machines linked to the current user (for pagination)
 * @returns {Promise<number>} Total number of batches
 */
export const getMachineLinkedTotalBatchesCount = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return 0
    if (linkedMachines.length === 0) {
      return 0
    }

    const batchesQuery = query(
      collection(db, "batches"),
      where("machine_id", "in", linkedMachines)
    )
    
    const batchesSnapshot = await getDocs(batchesQuery)
    return batchesSnapshot.size
  } catch (error) {
    console.error("Error getting total machine-linked batches count:", error)
    return 0
  }
}

/**
 * Get a single batch by batch number, only if it belongs to a machine linked to the current user
 * @param {string} batchNumber - Batch number to fetch
 * @returns {Promise<object|null>} Batch data or null if not found or not authorized
 */
export const getMachineLinkedBatchByNumber = async (batchNumber) => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return null
    if (linkedMachines.length === 0) {
      return null
    }

    const batchesQuery = query(
      collection(db, "batches"),
      where("batch_number", "==", batchNumber),
      where("machine_id", "in", linkedMachines),
      limit(1)
    )

    const batchesSnapshot = await getDocs(batchesQuery)

    if (batchesSnapshot.empty) {
      return null
    }

    const batchDoc = batchesSnapshot.docs[0]
    const data = batchDoc.data()
    const created = formatDate(data.created_at)
    const updated = formatDate(data.updated_at)

    // Calculate the primary defect type
    const defectCounts = data.defect_counts || {}
    let primaryDefectType = "None"
    let maxCount = 0

    Object.entries(defectCounts).forEach(([type, count]) => {
      if (type !== "good" && count > maxCount) {
        maxCount = count
        primaryDefectType = type.charAt(0).toUpperCase() + type.slice(1)
      }
    })

    // Calculate confidence (mock calculation - adjust as needed)
    const totalDefects = Object.values(defectCounts).reduce((sum, count) => sum + count, 0)
    const confidence = totalDefects > 0 ? Math.round((maxCount / totalDefects) * 100 * 10) / 10 : 0

    return {
      id: batchDoc.id,
      batchNumber: data.batch_number,
      timestamp: created.shortDate,
      time: created.time,
      defectType: primaryDefectType,
      confidence: confidence,
      totalDefects: data.total_count || 0,
      uniqueDefectTypes: Object.keys(defectCounts).filter((key) => key !== "good" && defectCounts[key] > 0).length,
      timeRange: `${created.time} - ${updated.time}`,
      fromDate: created.fullDate,
      toDate: updated.fullDate,
      machineId: data.machine_id,
      status: data.status,
      defectCounts: data.defect_counts,
      rawData: data,
    }
  } catch (error) {
    console.error("Error getting machine-linked batch by number:", error)
    return null
  }
}

/**
 * Set up real-time listener for batches only for machines linked to the current user
 * @param {number} pageSize - Number of batches to fetch per page
 * @param {function} callback - Callback function to handle batches data
 * @returns {function} Unsubscribe function
 */
export const subscribeToMachineLinkedBatches = async (pageSize = 6, callback) => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array via callback
    if (linkedMachines.length === 0) {
      callback([])
      return () => {} // Return empty unsubscribe function
    }

    const batchesQuery = query(
      collection(db, "batches"),
      where("machine_id", "in", linkedMachines),
      orderBy("created_at", "desc"),
      limit(pageSize)
    )

    return onSnapshot(batchesQuery, (snapshot) => {
      const batches = snapshot.docs.map((doc) => {
        const data = doc.data()
        const created = formatDate(data.created_at)
        const updated = formatDate(data.updated_at)

        // Calculate the primary defect type
        const defectCounts = data.defect_counts || {}
        let primaryDefectType = "None"
        let maxCount = 0

        Object.entries(defectCounts).forEach(([type, count]) => {
          if (type !== "good" && count > maxCount) {
            maxCount = count
            primaryDefectType = type.charAt(0).toUpperCase() + type.slice(1)
          }
        })

        // Calculate confidence (mock calculation - adjust as needed)
        const totalDefects = Object.values(defectCounts).reduce((sum, count) => sum + count, 0)
        const confidence = totalDefects > 0 ? Math.round((maxCount / totalDefects) * 100 * 10) / 10 : 0

        return {
          id: doc.id,
          batchNumber: data.batch_number,
          timestamp: created.shortDate,
          time: created.time,
          defectType: primaryDefectType,
          confidence: confidence,
          totalDefects: data.total_count || 0,
          uniqueDefectTypes: Object.keys(defectCounts).filter((key) => key !== "good" && defectCounts[key] > 0).length,
          timeRange: `${created.time} - ${updated.time}`,
          fromDate: created.fullDate,
          toDate: updated.fullDate,
          machineId: data.machine_id,
          status: data.status,
          defectCounts: data.defect_counts,
          rawData: data,
        }
      })

      callback(batches)
    })
  } catch (error) {
    console.error("Error setting up machine-linked batches subscription:", error)
    callback([])
    return () => {} // Return empty unsubscribe function
  }
}

/**
 * Get overview data for batches only for machines linked to the current user
 * @returns {Promise<object>} Overview data
 */
export const getMachineLinkedBatchesOverview = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return default overview
    if (linkedMachines.length === 0) {
      return {
        totalDefects: 0,
        uniqueDefectTypes: 0,
        timeRange: "N/A",
      }
    }

    const batchesQuery = query(
      collection(db, "batches"),
      where("machine_id", "in", linkedMachines)
    )
    
    const batchesSnapshot = await getDocs(batchesQuery)

    let totalDefects = 0
    const defectTypes = new Set()
    let earliestTime = null
    let latestTime = null

    batchesSnapshot.docs.forEach((doc) => {
      const data = doc.data()

      // Count total defects
      totalDefects += data.total_count || 0

      // Count unique defect types
      const defectCounts = data.defect_counts || {}
      Object.entries(defectCounts).forEach(([type, count]) => {
        if (type !== "good" && count > 0) {
          defectTypes.add(type)
        }
      })

      // Track time range
      const createdAt = data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at)

      if (!earliestTime || createdAt < earliestTime) {
        earliestTime = createdAt
      }

      if (!latestTime || createdAt > latestTime) {
        latestTime = createdAt
      }
    })

    // Format time range
    let timeRange = "N/A"
    if (earliestTime && latestTime) {
      const formatTime = (date) => {
        const hours = date.getHours()
        const minutes = date.getMinutes()
        const seconds = date.getSeconds()
        const ampm = hours >= 12 ? "PM" : "AM"
        const formattedHours = hours % 12 || 12
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
        const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm}`
      }

      timeRange = `${formatTime(earliestTime)} - ${formatTime(latestTime)}`
    }

    return {
      totalDefects,
      uniqueDefectTypes: defectTypes.size,
      timeRange,
    }
  } catch (error) {
    console.error("Error getting machine-linked batches overview:", error)
    return {
      totalDefects: 0,
      uniqueDefectTypes: 0,
      timeRange: "N/A",
    }
  }
}