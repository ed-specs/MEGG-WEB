import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { ref, getDownloadURL } from "firebase/storage"
import { db, storage } from "../../config/firebaseConfig"
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
      console.error("SortLogHistory: No authenticated user found")
      return []
    }

    console.log("SortLogHistory: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("SortLogHistory: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("SortLogHistory: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("SortLogHistory: Error getting user's linked machines:", error)
    return []
  }
}

/**
 * Get weight logs only for machines linked to the current user
 * @returns {Promise<Array>} Array of weight logs for machines linked to the current user
 */
export const getMachineLinkedWeightLogs = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("SortLogHistory: No linked machines found for user")
      return []
    }

    console.log("SortLogHistory: Querying weight logs for machines:", linkedMachines)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)
    
    console.log("SortLogHistory: Found", snapshot.docs.length, "weight log documents")

    const logs = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      // Convert Firestore timestamp to readable format
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()
      const dateStr = timestamp.toLocaleDateString()
      const timeStr = timestamp.toLocaleTimeString()

      // Map size values to more readable format
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

      return {
        id: doc.id,
        timestamp: dateStr,
        time: timeStr,
        batchNumber: data.batch_id || "",
        size: sizeMapping[data.size] || data.size || "Unknown",
        weight: data.weight || 0,
        machineId: data.machine_id || "",
      }
    }))

    return logs
  } catch (error) {
    console.error("SortLogHistory: Error getting machine-linked weight logs:", error)
    return []
  }
}

/**
 * Get filtered weight logs only for machines linked to the current user
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Filtered array of weight logs for machines linked to the current user
 */
export const getFilteredMachineLinkedWeightLogs = async (filters) => {
  try {
    const { size, date, batchNumber, searchQuery } = filters

    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    const weightLogsRef = collection(db, "weight_logs")
    const constraints = [
      // Always filter by user's linked machines
      where("machine_id", "in", linkedMachines)
    ]

    // Apply additional filters
    if (size && size !== "All Types") {
      // Map readable size back to database format
      const sizeMapping = {
        'Small': ['TOO_SMALL', 'SMALL'],
        'Medium': ['MEDIUM'],
        'Large': ['LARGE', 'EXTRA_LARGE', 'TOO_LARGE', 'JUMBO'],
        'Defect': ['DEFECT']
      }
      const dbSizes = sizeMapping[size] || [size]
      constraints.push(where("size", "in", dbSizes))
    }

    if (batchNumber && batchNumber !== "All Batches") {
      constraints.push(where("batch_id", "==", batchNumber))
    }

    if (date) {
      // Convert date string to start and end of day timestamps
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      constraints.push(where("timestamp", ">=", startDate))
      constraints.push(where("timestamp", "<=", endDate))
    }

    // Create query with constraints
    const q = query(weightLogsRef, ...constraints)
    const snapshot = await getDocs(q)

    let results = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      // Convert Firestore timestamp to readable format
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()
      const dateStr = timestamp.toLocaleDateString()
      const timeStr = timestamp.toLocaleTimeString()

      // Map size values to more readable format
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

      return {
        id: doc.id,
        timestamp: dateStr,
        time: timeStr,
        batchNumber: data.batch_id || "",
        size: sizeMapping[data.size] || data.size || "Unknown",
        weight: data.weight || 0,
        machineId: data.machine_id || "",
      }
    }))

    // Apply search query filter client-side
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (log) => log.batchNumber.toLowerCase().includes(query) || log.size.toLowerCase().includes(query),
      )
    }

    return results
  } catch (error) {
    console.error("SortLogHistory: Error getting filtered machine-linked weight logs:", error)
    return []
  }
}

/**
 * Get unique batch numbers for filter dropdown, only from machines linked to the current user
 * @returns {Promise<string[]>} Array of unique batch numbers
 */
export const getMachineLinkedBatchNumbers = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)

    // Extract unique batch numbers
    const batchNumbersSet = new Set()
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.batch_id) {
        batchNumbersSet.add(data.batch_id)
      }
    })

    return Array.from(batchNumbersSet)
  } catch (error) {
    console.error("SortLogHistory: Error getting machine-linked batch numbers:", error)
    return []
  }
}

/**
 * Get unique sizes for filter dropdown, only from machines linked to the current user
 * @returns {Promise<string[]>} Array of unique sizes
 */
export const getMachineLinkedSizes = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)

    // Extract unique sizes and map to readable format
    const sizesSet = new Set()
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

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.size) {
        const readableSize = sizeMapping[data.size] || data.size
        sizesSet.add(readableSize)
      }
    })

    return Array.from(sizesSet)
  } catch (error) {
    console.error("SortLogHistory: Error getting machine-linked sizes:", error)
    return []
  }
}

