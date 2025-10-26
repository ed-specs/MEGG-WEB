import { useState, useEffect } from "react"
import {
  getMachineLinkedTodayDefects,
  getMachineLinkedPreviousDayDefects,
  getMachineLinkedWeekDefects,
  calculateDailyAverage,
  findPeakTime,
  getHourlyDistribution,
  getDefectCounts,
  calculatePercentageChange,
} from "../../lib/history/DailySummarry"
import {
  getMachineLinkedTodaySorts,
  getMachineLinkedPreviousDaySorts,
  getMachineLinkedWeekSorts,
  calculateSizeCounts,
  calculateHourlyDistribution,
} from "../../lib/history/SortDailySummary"

export function useMachineLinkedDefectData() {
  const [periodTotal, setPeriodTotal] = useState(0)
  const [dailyAverage, setDailyAverage] = useState(0)
  const [peakTime, setPeakTime] = useState("N/A")
  const [percentageChange, setPercentageChange] = useState(0)
  const [hourlyDistribution, setHourlyDistribution] = useState([])
  const [defectCounts, setDefectCounts] = useState({ dirty: 0, cracked: 0, good: 0 })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("DailySummary Hook: Starting to fetch data...")

      // Get defects for today, yesterday, and last week
      const todayDefects = await getMachineLinkedTodayDefects()
      const yesterdayDefects = await getMachineLinkedPreviousDayDefects()
      const weekDefects = await getMachineLinkedWeekDefects()

      console.log("DailySummary Hook: Fetched data:", {
        today: todayDefects.length,
        yesterday: yesterdayDefects.length,
        week: weekDefects.length
      })

      // Calculate metrics
      const todayTotal = todayDefects.length
      const yesterdayTotal = yesterdayDefects.length
      const average = calculateDailyAverage(weekDefects)
      const peak = findPeakTime(weekDefects)
      const hourlyData = getHourlyDistribution(weekDefects)
      const counts = getDefectCounts(weekDefects)
      const change = calculatePercentageChange(todayTotal, yesterdayTotal)

      console.log("DailySummary Hook: Calculated metrics:", {
        todayTotal,
        yesterdayTotal,
        average,
        peak,
        change,
        counts
      })

      // Update state
      setPeriodTotal(todayTotal)
      setDailyAverage(average)
      setPeakTime(peak)
      setPercentageChange(change)
      setHourlyDistribution(hourlyData)
      setDefectCounts(counts)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("DailySummary Hook: Error fetching defect data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Function to manually refresh data
  const refreshData = () => {
    fetchData()
  }

  return {
    periodTotal,
    dailyAverage,
    peakTime,
    percentageChange,
    hourlyDistribution,
    defectCounts,
    lastUpdated,
    loading,
    error,
    refreshData,
  }
}

export function useSortDailySummary() {
  const [data, setData] = useState({
    todaySorts: [],
    yesterdaySorts: [],
    weekSorts: [],
    todayTotal: 0,
    yesterdayTotal: 0,
    average: 0,
    peak: "N/A",
    change: 0,
    hourlyDistribution: {},
    counts: {},
    lastUpdated: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("SortDailySummary Hook: Starting to fetch data...")

      // Get sorts for today, yesterday, and last week
      const todaySorts = await getMachineLinkedTodaySorts()
      const yesterdaySorts = await getMachineLinkedPreviousDaySorts()
      const weekSorts = await getMachineLinkedWeekSorts()

      console.log("SortDailySummary Hook: Fetched data:", {
        today: todaySorts.length,
        yesterday: yesterdaySorts.length,
        week: weekSorts.length
      })

      // Calculate metrics
      const todayTotal = todaySorts.length
      const yesterdayTotal = yesterdaySorts.length
      const average = calculateDailyAverage(weekSorts)
      const peak = findPeakTime(weekSorts)
      const hourlyData = calculateHourlyDistribution(weekSorts)
      const sizeCounts = calculateSizeCounts(weekSorts)
      const change = calculatePercentageChange(todayTotal, yesterdayTotal)

      console.log("SortDailySummary Hook: Calculated metrics:", {
        todayTotal,
        yesterdayTotal,
        average,
        peak,
        change,
        sizeCounts,
        averageType: typeof average,
        changeType: typeof change
      })

      // Update state
      setData({
        todaySorts,
        yesterdaySorts,
        weekSorts,
        todayTotal,
        yesterdayTotal,
        average: average,
        peak: peak,
        change: change,
        hourlyDistribution: hourlyData,
        counts: sizeCounts,
        lastUpdated: new Date()
      })
    } catch (err) {
      console.error("SortDailySummary Hook: Error fetching sort data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Function to manually refresh data
  const refetch = () => {
    fetchData()
  }

  return {
    data,
    loading,
    error,
    refetch,
  }
}