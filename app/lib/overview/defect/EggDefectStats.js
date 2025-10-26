import { db } from "../../../config/firebaseConfig"
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { getCurrentUser } from "../../../utils/auth-utils"

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

// Fetch all defect logs for machines linked to the current user
export async function fetchMachineLinkedDefectLogs() {
  try {
    // Get user's linked machines
    const linkedMachines = await getUserLinkedMachines()
    
    // If no linked machines, return empty array
    if (linkedMachines.length === 0) {
      return []
    }

    const defectLogsRef = collection(db, "defect_logs")
    const snapshot = await getDocs(defectLogsRef)
    
    // Filter results for linked machines
    return snapshot.docs
      .filter(doc => linkedMachines.includes(doc.data().machine_id))
      .map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Error fetching machine-linked defect logs:", error)
    throw error
  }
}

// Get defect distribution (for donut chart) for machines linked to the current user
export async function getMachineLinkedDefectDistribution() {
  try {
    const logs = await fetchMachineLinkedDefectLogs()

    // Count defects by type
    const defectCounts = logs.reduce((acc, log) => {
      const defectType = log.defect_type
      acc[defectType] = (acc[defectType] || 0) + 1
      return acc
    }, {})

    // Calculate percentages and prepare data for chart
    const total = Object.values(defectCounts).reduce((sum, count) => sum + count, 0)

    // Define the order of defect types we want
    const defectTypes = ["cracked", "good", "dirty", "other"]

    // Map to our expected format with percentages
    let currentOffset = 0
    const segments = defectTypes.map((type) => {
      const count = defectCounts[type] || 0
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0

      const segment = {
        name:
          type === "cracked"
            ? "Cracks"
            : type === "good"
              ? "Good"
              : type === "dirty"
                ? "Dirty"
                : type === "blood_spot"
                  ? "Blood Spots"
                  : "Other",
        color:
          type === "cracked"
            ? "#0e5f97"
            : type === "good"
              ? "#CC5500"
              : type === "dirty"
                ? "#b0b0b0"
                : type === "blood_spot"
                  ? "#fb510f"
                  : "#ecb662",
        percentage,
        count,
        offset: currentOffset,
      }

      // Update offset for next segment
      currentOffset += (percentage / 100) * 251.2 // 251.2 is the circumference of a circle with radius 40

      return segment
    })

    return segments
  } catch (error) {
    console.error("Error getting machine-linked defect distribution:", error)
    throw error
  }
}

// Get summary statistics for machines linked to the current user
export async function getMachineLinkedDefectStats() {
  try {
    const logs = await fetchMachineLinkedDefectLogs()

    // Total eggs inspected
    const totalEggs = logs.length

    // Calculate defect rate
    const defectRate =
      totalEggs > 0 ? ((logs.filter((log) => log.defect_type !== "none").length / totalEggs) * 100).toFixed(2) : "0.00"

    // Calculate average eggs per hour
    // Assuming logs have timestamps, get the earliest and latest
    if (logs.length === 0) {
      return {
        totalEggs: 0,
        avgEggsPerHour: 0,
        defectRate: "0.00",
        mostCommonDefect: "None",
      }
    }

    const timestamps = logs.map((log) => new Date(log.timestamp).getTime())
    const earliestTime = Math.min(...timestamps)
    const latestTime = Math.max(...timestamps)

    const totalHours = (latestTime - earliestTime) / (1000 * 60 * 60)
    const avgEggsPerHour = totalHours > 0 ? Math.round(totalEggs / totalHours) : 0

    // Find most common defect
    const defectCounts = logs.reduce((acc, log) => {
      const defectType = log.defect_type
      acc[defectType] = (acc[defectType] || 0) + 1
      return acc
    }, {})

    let mostCommonDefect = "None"
    let maxCount = 0

    Object.entries(defectCounts).forEach(([defect, count]) => {
      if (defect !== "none" && count > maxCount) {
        mostCommonDefect = defect
        maxCount = count
      }
    })

    // Format the most common defect name
    const formattedDefect =
      mostCommonDefect === "cracked"
        ? "Cracked"
        : mostCommonDefect === "good"
          ? "Good"
          : mostCommonDefect === "dirty"
            ? "Dirty"
            : mostCommonDefect === "blood_spot"
              ? "Blood Spot"
              : mostCommonDefect === "other"
                ? "Other"
                : "None"

    return {
      totalEggs,
      avgEggsPerHour,
      defectRate: `${defectRate}%`,
      mostCommonDefect: formattedDefect,
    }
  } catch (error) {
    console.error("Error getting machine-linked defect stats:", error)
    throw error
  }
}