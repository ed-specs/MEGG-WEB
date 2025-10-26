import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "../../config/firebaseConfig"
import { getCurrentUser } from "../../utils/auth-utils"

// Helper: robustly convert Firestore Timestamp or JS date-like to Date
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

/**
 * Get the current user's linked machines
 * @returns {Promise<string[]>} Array of machine IDs linked to the current user
 */
export const getUserLinkedMachines = async () => {
  // Deprecated in the new model (one account == one machine). Kept for compatibility.
  return []
}

// Helper: get current user's accountId
const getCurrentAccountId = async () => {
  try {
    const user = getCurrentUser()
    if (!user) {
      console.warn("InventoryData: No authenticated user found (yet)")
      return null
    }

    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)
    if (!userDoc.exists()) {
      console.warn("InventoryData: User document not found for user:", user.uid)
      return null
    }

    const data = userDoc.data()
    const accountId = data?.accountId || null
    if (!accountId) {
      console.warn("InventoryData: accountId missing on user document", user.uid)
    }
    return accountId
  } catch (error) {
    console.error("InventoryData: Error getting current accountId:", error)
    return null
  }
}

/**
 * Get inventory data grouped by batch only for machines linked to the current user
 * @returns {Promise<Array>} Array of batch inventory objects for machines linked to the current user
 */
export const getMachineLinkedInventoryData = async () => {
  try {
    // New model: use current user's accountId and read aggregate batch docs
    const accountId = await getCurrentAccountId()
    if (!accountId) {
      console.log("InventoryData: No accountId; returning empty inventory")
      return []
    }

    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", accountId))
    const snapshot = await getDocs(qBatches)

    const inventoryData = snapshot.docs.map((d) => {
      const data = d.data()
      const stats = data?.stats || {}
      const created = tsToDate(data?.createdAt)
      const updated = tsToDate(data?.updatedAt) || created

      const small = Number(stats.smallEggs || 0)
      const med = Number(stats.mediumEggs || 0)
      const large = Number(stats.largeEggs || 0)
      const defect = Number((stats.badEggs || 0) + (stats.dirtyEggs || 0))
      const goodEggs = typeof stats.goodEggs === 'number' ? Number(stats.goodEggs) : (small + med + large)

      // Determine most common size among Small/Medium/Large
      const sizePairs = [
        ["Small", small],
        ["Medium", med],
        ["Large", large],
      ]
      const mostCommonSize = sizePairs.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc), ["Unknown", -1])[0]

      const eggSizes = {
        Small: small,
        Medium: med,
        Large: large,
        Defect: defect,
      }

      const totalEggs = Number(stats.totalEggs || small + med + large + defect)

      return {
        batchNumber: data?.id || d.id,
        totalEggs,
        totalSort: goodEggs,
        goodEggs,
        commonSize: mostCommonSize,
        timeRange: `${created.toLocaleTimeString()} - ${updated.toLocaleTimeString()}`,
        fromDate: created.toLocaleString(),
        toDate: updated.toLocaleString(),
        eggSizes,
        logs: [],
        sizeCounts: eggSizes,
      }
    })

    // Sort by updated time desc, fallback to batchNumber desc
    inventoryData.sort((a, b) => b.toDate.localeCompare(a.toDate) || b.batchNumber.localeCompare(a.batchNumber))

    return inventoryData
  } catch (error) {
    console.error("InventoryData: Error getting inventory data from batches:", error)
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
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // New model: query eggs for this account and batch
    const eggsRef = collection(db, "eggs")
    const qEggs = query(eggsRef, where("accountId", "==", accountId), where("batchId", "==", batchId))
    const snapshot = await getDocs(qEggs)

    const logs = snapshot.docs.map((d) => {
      const data = d.data()
      const created = data?.createdAt ? new Date(data.createdAt) : new Date()

      // Determine size and defect
      let size = (data?.size || "").toString().toLowerCase()
      const quality = (data?.quality || "").toString().toLowerCase()
      let mappedSize = "Unknown"
      if (["small", "medium", "large"].includes(size)) {
        mappedSize = size.charAt(0).toUpperCase() + size.slice(1)
      }
      if (quality && quality !== "good") {
        mappedSize = "Defect"
      }

      return {
        id: d.id,
        ...data,
        timestamp: created,
        size: mappedSize,
      }
    })

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp)
    return logs
  } catch (error) {
    console.error("InventoryData: Error getting batch details from eggs:", error)
    return []
  }
}

/**
 * Get unique batch IDs only for machines linked to the current user
 * @returns {Promise<string[]>} Array of unique batch IDs
 */
export const getMachineLinkedBatchIds = async () => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", accountId))
    const snapshot = await getDocs(qBatches)
    return snapshot.docs.map((d) => d.data()?.id || d.id)
  } catch (error) {
    console.error("InventoryData: Error getting batch IDs from batches:", error)
    return []
  }
}



