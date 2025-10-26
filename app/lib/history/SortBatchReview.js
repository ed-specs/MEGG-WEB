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
      console.error("SortBatchReview: No authenticated user found")
      return []
    }

    console.log("SortBatchReview: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("SortBatchReview: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("SortBatchReview: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("SortBatchReview: Error getting user's linked machines:", error)
    return []
  }
}

/**
 * Get weight logs grouped by batch only for machines linked to the current user
 * @returns {Promise<Array>} Array of batch review objects for machines linked to the current user
 */
export const getMachineLinkedBatchReviews = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("SortBatchReview: No linked machines found for user")
      return []
    }

    console.log("SortBatchReview: Querying weight logs for machines:", linkedMachines)

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)
    
    console.log("SortBatchReview: Found", snapshot.docs.length, "weight log documents")

    // Group logs by batch_id
    const batchGroups = {}
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      const batchId = data.batch_id || "Unknown"
      
      if (!batchGroups[batchId]) {
        batchGroups[batchId] = []
      }
      
      batchGroups[batchId].push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      })
    })

    console.log("SortBatchReview: Grouped into", Object.keys(batchGroups).length, "batches")

    // Convert to batch review format
    const batchReviews = Object.keys(batchGroups).map((batchId) => {
      const logs = batchGroups[batchId]
      
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

      // Calculate statistics
      const totalSort = logs.length
      
      // Find most common size
      const sizeCounts = {}
      logs.forEach((log) => {
        const sizeType = sizeMapping[log.size] || log.size || "unknown"
        sizeCounts[sizeType] = (sizeCounts[sizeType] || 0) + 1
      })
      
      const mostCommonSize = Object.keys(sizeCounts).reduce((a, b) => 
        sizeCounts[a] > sizeCounts[b] ? a : b, "Unknown"
      )

      // Get time range
      const timestamps = logs.map(log => log.timestamp).sort((a, b) => a - b)
      const fromDate = timestamps[0]
      const toDate = timestamps[timestamps.length - 1]
      
      const timeRange = `${fromDate.toLocaleTimeString()} - ${toDate.toLocaleTimeString()}`
      const fromDateStr = fromDate.toLocaleString()
      const toDateStr = toDate.toLocaleString()

      return {
        batchNumber: batchId,
        totalSort,
        commonSize: mostCommonSize,
        timeRange,
        fromDate: fromDateStr,
        toDate: toDateStr,
        logs: logs, // Include raw logs for detailed view
        sizeCounts, // Include size distribution
      }
    })

    // Sort by batch number (most recent first)
    batchReviews.sort((a, b) => b.batchNumber.localeCompare(a.batchNumber))

    console.log("SortBatchReview: Generated", batchReviews.length, "batch reviews")
    return batchReviews
  } catch (error) {
    console.error("SortBatchReview: Error getting machine-linked batch reviews:", error)
    return []
  }
}

/**
 * Get detailed logs for a specific batch only for machines linked to the current user
 * @param {string} batchId - The batch ID to get details for
 * @returns {Promise<Array>} Array of weight logs for the specific batch
 */
export const getMachineLinkedBatchDetails = async (batchId) => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("SortBatchReview: No linked machines found for user")
      return []
    }

    console.log("SortBatchReview: Getting details for batch:", batchId)

    // Query weight logs for specific batch and linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(
      weightLogsRef, 
      where("batch_id", "==", batchId),
      where("machine_id", "in", linkedMachines)
    )
    const snapshot = await getDocs(q)
    
    console.log("SortBatchReview: Found", snapshot.docs.length, "logs for batch", batchId)

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data()
      
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

      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        size: sizeMapping[data.size] || data.size || "Unknown",
      }
    })

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp)

    return logs
  } catch (error) {
    console.error("SortBatchReview: Error getting machine-linked batch details:", error)
    return []
  }
}

/**
 * Get unique batch IDs only for machines linked to the current user
 * @returns {Promise<string[]>} Array of unique batch IDs
 */
export const getMachineLinkedBatchIds = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("SortBatchReview: No linked machines found for user")
      return []
    }

    // Query weight logs where machine_id is in the user's linked machines
    const weightLogsRef = collection(db, "weight_logs")
    const q = query(weightLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)

    // Extract unique batch IDs
    const batchIdsSet = new Set()
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.batch_id) {
        batchIdsSet.add(data.batch_id)
      }
    })

    const batchIds = Array.from(batchIdsSet)
    console.log("SortBatchReview: Found", batchIds.length, "unique batch IDs")
    return batchIds
  } catch (error) {
    console.error("SortBatchReview: Error getting machine-linked batch IDs:", error)
    return []
  }
}



