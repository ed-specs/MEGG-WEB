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
      console.error("DefectLogHistory: No authenticated user found")
      return []
    }

    console.log("DefectLogHistory: Current user:", user.uid)

    // Get user document from Firestore
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.error("DefectLogHistory: User document not found for user:", user.uid)
      return []
    }

    // Get linked machines from user document
    const userData = userDoc.data()
    const linkedMachines = userData.linkedMachines || []
    
    console.log("DefectLogHistory: User's linked machines:", linkedMachines)
    return Array.isArray(linkedMachines) ? linkedMachines : []
  } catch (error) {
    console.error("DefectLogHistory: Error getting user's linked machines:", error)
    return []
  }
}

/**
 * Get defect logs only for machines linked to the current user
 * @returns {Promise<Array>} Array of defect logs for machines linked to the current user
 */
export const getMachineLinkedDefectLogs = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      console.log("DefectLogHistory: No linked machines found for user")
      return []
    }

    console.log("DefectLogHistory: Querying defect logs for machines:", linkedMachines)

    // Query defect logs where machine_id is in the user's linked machines
    const defectLogsRef = collection(db, "defect_logs")
    const q = query(defectLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)
    
    console.log("DefectLogHistory: Found", snapshot.docs.length, "defect log documents")

    const logs = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      // Convert Firestore timestamp to readable format
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()
      const dateStr = timestamp.toLocaleDateString()
      const timeStr = timestamp.toLocaleTimeString()

      // Fetch image URL if image_id exists
      let imageUrl = null
      if (data.image_id && data.batch_id) {
        try {
          const imagePath = `images/${data.batch_id}/${data.image_id}`
          const imageRef = ref(storage, imagePath)
          imageUrl = await getDownloadURL(imageRef)
        } catch (error) {
          console.warn(`Failed to fetch image URL for ${data.image_id}:`, error)
        }
      }

      return {
        id: doc.id,
        timestamp: dateStr,
        time: timeStr,
        batchNumber: data.batch_id || "",
        defectType: data.defect_type || "",
        confidence: data.confidence_score ? Number.parseFloat(data.confidence_score) * 100 : 0,
        imageId: data.image_id || "",
        imageUrl: imageUrl,
        machineId: data.machine_id || "",
      }
    }))

    return logs
  } catch (error) {
    console.error("Error getting machine-linked defect logs:", error)
    return []
  }
}

/**
 * Get filtered defect logs only for machines linked to the current user
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Filtered array of defect logs for machines linked to the current user
 */
export const getFilteredMachineLinkedDefectLogs = async (filters) => {
  try {
    const { defectType, date, batchNumber, searchQuery } = filters

    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    const defectLogsRef = collection(db, "defect_logs")
    const constraints = [
      // Always filter by user's linked machines
      where("machine_id", "in", linkedMachines)
    ]

    // Apply additional filters
    if (defectType && defectType !== "All Types") {
      constraints.push(where("defect_type", "==", defectType))
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
    const q = query(defectLogsRef, ...constraints)
    const snapshot = await getDocs(q)

    let results = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      // Convert Firestore timestamp to readable format
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date()
      const dateStr = timestamp.toLocaleDateString()
      const timeStr = timestamp.toLocaleTimeString()

      // Fetch image URL if image_id exists
      let imageUrl = null
      if (data.image_id && data.batch_id) {
        try {
          const imagePath = `images/${data.batch_id}/${data.image_id}`
          const imageRef = ref(storage, imagePath)
          imageUrl = await getDownloadURL(imageRef)
        } catch (error) {
          console.warn(`Failed to fetch image URL for ${data.image_id}:`, error)
        }
      }

      return {
        id: doc.id,
        timestamp: dateStr,
        time: timeStr,
        batchNumber: data.batch_id || "",
        defectType: data.defect_type || "",
        confidence: data.confidence_score ? Number.parseFloat(data.confidence_score) * 100 : 0,
        imageId: data.image_id || "",
        imageUrl: imageUrl,
        machineId: data.machine_id || "",
      }
    }))

    // Apply search query filter client-side
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (log) => log.batchNumber.toLowerCase().includes(query) || log.defectType.toLowerCase().includes(query),
      )
    }

    return results
  } catch (error) {
    console.error("Error getting filtered machine-linked defect logs:", error)
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

    // Query defect logs where machine_id is in the user's linked machines
    const defectLogsRef = collection(db, "defect_logs")
    const q = query(defectLogsRef, where("machine_id", "in", linkedMachines))
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
    console.error("Error getting machine-linked batch numbers:", error)
    return []
  }
}

/**
 * Get unique defect types for filter dropdown, only from machines linked to the current user
 * @returns {Promise<string[]>} Array of unique defect types
 */
export const getMachineLinkedDefectTypes = async () => {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    // Query defect logs where machine_id is in the user's linked machines
    const defectLogsRef = collection(db, "defect_logs")
    const q = query(defectLogsRef, where("machine_id", "in", linkedMachines))
    const snapshot = await getDocs(q)

    // Extract unique defect types
    const defectTypesSet = new Set()
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.defect_type) {
        defectTypesSet.add(data.defect_type)
      }
    })

    return Array.from(defectTypesSet)
  } catch (error) {
    console.error("Error getting machine-linked defect types:", error)
    return []
  }
}