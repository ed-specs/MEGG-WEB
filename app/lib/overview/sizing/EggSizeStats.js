import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"
import { getCurrentUser } from "../../../utils/auth-utils"

// Helpers
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

const getCurrentAccountId = async () => {
  try {
    const user = getCurrentUser()
    if (!user) return null
    const ref = doc(db, "users", user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data()?.accountId || null
  } catch (e) {
    console.error("EggSizeStats: failed to get accountId", e)
    return null
  }
}

const pickMostCommonSize = (counts) => {
  const pairs = [
    ['Small', Number(counts.small || 0)],
    ['Medium', Number(counts.medium || 0)],
    ['Large', Number(counts.large || 0)],
  ]
  const max = Math.max(...pairs.map(([, v]) => v))
  if (max <= 0) return 'None'
  const winners = pairs.filter(([, v]) => v === max).map(([k]) => k)
  return winners.length > 1 ? winners.join(' & ') : winners[0]
}

// Get egg size statistics for linked machines
export const getMachineLinkedEggSizeStats = async (period = 'daily') => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) {
      return { totalEggs: 0, avgEggsPerHour: 0, sortingAccuracy: "0.00%", mostCommonSize: "None" }
    }

    // Window depends on period
    const endDate = new Date()
    const startDate = new Date()
    if (period === 'monthly') {
      startDate.setMonth(endDate.getMonth() - 6)
    } else {
      startDate.setHours(endDate.getHours() - 24)
    }

    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snap = await getDocs(qBatches)
    const batches = snap.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Aggregate counts (from batches)
    let totals = { small: 0, medium: 0, large: 0, defect: 0, good: 0 }
    let earliest = null
    let latest = null
    let minutesSum = 0
    let eggsTotalForRate = 0
    batches.forEach(b => {
      const s = b?.stats || {}
      totals.small += Number(s.smallEggs || 0)
      totals.medium += Number(s.mediumEggs || 0)
      totals.large += Number(s.largeEggs || 0)
      totals.defect += Number((s.badEggs || 0) + (s.dirtyEggs || 0))
      const good = typeof s.goodEggs === 'number' ? Number(s.goodEggs) : (Number(s.smallEggs||0)+Number(s.mediumEggs||0)+Number(s.largeEggs||0))
      totals.good += good

      const created = tsToDate(b?.createdAt)
      // support both updatedAt and updated_at
      const updatedRaw = (b?.updatedAt !== undefined ? b.updatedAt : b?.updated_at)
      const updated = tsToDate(updatedRaw) || created
      earliest = !earliest || created < earliest ? created : earliest
      latest = !latest || created > latest ? created : latest
      const durMin = Math.max((updated - created) / (1000 * 60), 1)
      minutesSum += durMin
      const totalThisBatch = typeof s.totalEggs === 'number'
        ? Number(s.totalEggs)
        : (Number(s.smallEggs||0) + Number(s.mediumEggs||0) + Number(s.largeEggs||0) + Number((s.badEggs||0) + (s.dirtyEggs||0)))
      eggsTotalForRate += totalThisBatch
    })

    const totalEggsSorted = totals.small + totals.medium + totals.large
    const totalDefects = totals.defect
    // Eggs per minute: total eggs (including defects) divided by total elapsed minutes
    const eggsPerMinute = minutesSum > 0 ? Number((eggsTotalForRate / minutesSum).toFixed(1)) : 0
    const mostCommonSize = pickMostCommonSize({ small: totals.small, medium: totals.medium, large: totals.large })
    // Defect stats
    const bad = batches.reduce((sum, b) => sum + Number((b?.stats?.badEggs) || 0), 0)
    const dirty = batches.reduce((sum, b) => sum + Number((b?.stats?.dirtyEggs) || 0), 0)
    const mostCommonDefect = (() => {
      if (bad === 0 && dirty === 0) return 'None'
      if (bad === dirty) return 'Bad & Dirty'
      return bad > dirty ? 'Bad' : 'Dirty'
    })()
    const denominator = totalEggsSorted + totalDefects
    const defectRate = denominator > 0 ? `${Math.round((totalDefects / denominator) * 100)}%` : '0%'

    return { totalEggs: totalEggsSorted, totalDefects, eggsPerMinute, mostCommonSize, mostCommonDefect, defectRate }
  } catch (error) {
    console.error("Error getting egg size stats:", error)
    return {
      totalEggs: 0,
      totalDefects: 0,
      eggsPerMinute: 0,
      mostCommonSize: "None",
      mostCommonDefect: "None",
      defectRate: "0%"
    }
  }
}

// Get egg size distribution for linked machines
export const getMachineLinkedEggSizeDistribution = async (period = 'daily') => {
  try {
    const accountId = await getCurrentAccountId()
    if (!accountId) return []

    // Window depends on period
    const endDate = new Date()
    const startDate = new Date()
    if (period === 'monthly') {
      startDate.setMonth(endDate.getMonth() - 6)
    } else {
      startDate.setDate(endDate.getDate() - 7)
    }

    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(qBatches)
    const docs = snapshot.docs
      .map(d => d.data())
      .filter(b => {
        const created = tsToDate(b?.createdAt)
        return created >= startDate && created <= endDate
      })

    // Sum buckets from batch stats
    const sizeCounts = { large: 0, medium: 0, small: 0, defect: 0 }
    docs.forEach(b => {
      const s = b?.stats || {}
      sizeCounts.large += Number(s.largeEggs || 0)
      sizeCounts.medium += Number(s.mediumEggs || 0)
      sizeCounts.small += Number(s.smallEggs || 0)
      sizeCounts.defect += Number((s.badEggs || 0) + (s.dirtyEggs || 0))
    })

    const totalEggs = Object.values(sizeCounts).reduce((a,b)=>a+b,0)
    const colors = {
      large: "#b0b0b0",
      medium: "#fb510f",
      small: "#ecb662",
      defect: "#dc2626"
    }

    const labels = {
      large: "Large",
      medium: "Medium",
      small: "Small",
      defect: "Defect"
    }

    // Create segments for donut chart
    const segments = Object.entries(sizeCounts).map(([size, count]) => ({
      name: labels[size] || size,
      count,
      percentage: totalEggs > 0 ? Math.round((count / totalEggs) * 100) : 0,
      color: colors[size] || "#000000"
    }))

    // Sort by count descending
    segments.sort((a, b) => b.count - a.count)

    return segments
  } catch (error) {
    console.error("Error getting egg size distribution:", error)
    return []
  }
}




