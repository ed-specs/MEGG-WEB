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
      // Daily = today only (midnight to now)
      startDate.setHours(0, 0, 0, 0)
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
    let totalGoodFromBatches = 0
    let foundGoodField = false
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
      if (typeof s.goodEggs === 'number') {
        totalGoodFromBatches += Number(s.goodEggs)
        foundGoodField = true
      }
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

    // Total Eggs Sorted: prefer explicit goodEggs if available
    let totalEggsSorted = foundGoodField ? totalGoodFromBatches : (totals.small + totals.medium + totals.large)
    const totalDefects = totals.defect
    // Eggs per minute: total eggs (including defects) divided by total elapsed minutes
    let eggsPerMinute = minutesSum > 0 ? Number((eggsTotalForRate / minutesSum).toFixed(1)) : 0
    // Expose totalAllEggs (including defects) based on batches aggregate
    let totalAllEggs = Math.round(eggsTotalForRate)
    let mostCommonSize = pickMostCommonSize({ small: totals.small, medium: totals.medium, large: totals.large })

    // Fallbacks: if batches lacked explicit goodEggs, try deriving from eggs collection
    if (!foundGoodField) {
      const qEggs = query(
        collection(db, "eggs"),
        where("accountId", "==", accountId)
      )
      const eggsSnap = await getDocs(qEggs)
      let small = 0, medium = 0, large = 0, defect = 0
      let first = null, last = null, totalEggsAll = 0
      let goodCount = 0
      eggsSnap.docs.forEach(d => {
        const e = d.data() || {}
        const created = tsToDate(e?.createdAt)
        if (created < startDate || created > endDate) return
        const q = (e.quality || "").toString().toLowerCase()
        if (q === 'small') small++
        else if (q === 'medium') medium++
        else if (q === 'large') large++
        else if (q === 'bad' || q === 'dirty' || q === 'defect') defect++
        else if (q === 'good') { goodCount++ }
        totalEggsAll++
        first = !first || created < first ? created : first
        last = !last || created > last ? created : last
      })
      totals = { small, medium, large, defect, good: small+medium+large }
      // If we derived counts from eggs, prefer good-only count for Total Eggs Sorted
      totalEggsSorted = goodCount > 0 ? goodCount : (small + medium + large)
      mostCommonSize = (small+medium+large) > 0 ? pickMostCommonSize({ small, medium, large }) : 'None'
      const minutes = first && last ? Math.max((last - first) / (1000*60), 1) : 0
      eggsPerMinute = minutes > 0 ? Number((totalEggsAll / minutes).toFixed(1)) : 0
      totalAllEggs = totalEggsAll
    }
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

    return { totalEggs: totalEggsSorted, totalAllEggs, totalDefects, eggsPerMinute, mostCommonSize, mostCommonDefect, defectRate }
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

    // Window depends on period (match stats function)
    const endDate = new Date()
    const startDate = new Date()
    if (period === 'monthly') {
      startDate.setMonth(endDate.getMonth() - 6)
    } else if (period === 'weekly') {
      startDate.setDate(endDate.getDate() - 7)
    } else {
      // Daily = today only
      startDate.setHours(0, 0, 0, 0)
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
      // Note: if only goodEggs without size buckets, we don't include an 'Unspecified' bucket
    })

    let totalEggs = Object.values(sizeCounts).reduce((a,b)=>a+b,0)

    // Fallback: compute distribution from eggs if batches have no counts
    if (totalEggs === 0) {
      const qEggs = query(
        collection(db, "eggs"),
        where("accountId", "==", accountId)
      )
      const eggsSnap = await getDocs(qEggs)
      eggsSnap.docs.forEach(d => {
        const e = d.data() || {}
        const created = tsToDate(e?.createdAt)
        if (created < startDate || created > endDate) return
        const q = (e.quality || "").toString().toLowerCase()
        if (q === 'small') sizeCounts.small++
        else if (q === 'medium') sizeCounts.medium++
        else if (q === 'large') sizeCounts.large++
        else if (q === 'bad' || q === 'dirty' || q === 'defect') sizeCounts.defect++
      })
      totalEggs = Object.values(sizeCounts).reduce((a,b)=>a+b,0)
    }
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




