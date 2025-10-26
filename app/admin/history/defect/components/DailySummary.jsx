"use client"

import { useState, useRef, useEffect } from "react"
import { BarChart2, Clock, RefreshCw, Target, Calendar, TrendingUp, LineChart, Download, ChevronDown } from 'lucide-react'
import { DefectChart } from "./DailySummarryChart"
import { exportDailySummary, exportToImage } from "../../../../utils/export-utils"
import { db, auth } from "../../../../config/firebaseConfig"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

export default function MachineLinkedDailySummary() {
  const [chartType, setChartType] = useState("bar")
  const [timeFilter, setTimeFilter] = useState("24h")
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef(null)
  const chartRef = useRef(null)

  // Local state to replace hook outputs
  const [periodTotal, setPeriodTotal] = useState(0)
  const [dailyAverage, setDailyAverage] = useState(0)
  const [peakTime, setPeakTime] = useState("N/A")
  const [percentageChange, setPercentageChange] = useState(0)
  const [hourlyDistribution, setHourlyDistribution] = useState([])
  const [defectCounts, setDefectCounts] = useState({ good: 0, cracked: 0, dirty: 0, bad: 0 })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getAccountId = async () => {
    const user = auth.currentUser
    if (!user) return null
    const userRef = doc(db, "users", user.uid)
    const snap = await getDoc(userRef)
    return snap.exists() ? (snap.data()?.accountId || null) : null
  }

  const formatHour = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()))
      return d.toISOString().slice(11,13) + ":00"
    } catch { return "00:00" }
  }

  const formatDate = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()))
      return d.toISOString().slice(0,10)
    } catch { return new Date().toISOString().slice(0,10) }
  }

  const getPeriodRange = () => {
    const now = new Date()
    const end = now
    const start = new Date(now)
    if (timeFilter === "24h") start.setHours(start.getHours() - 24)
    else if (timeFilter === "7d") start.setDate(start.getDate() - 7)
    else if (timeFilter === "30d") start.setDate(start.getDate() - 30)
    else if (timeFilter === "90d") start.setDate(start.getDate() - 90)
    return { start, end }
  }

  const getTimestampMillis = (ts) => {
    if (!ts) return 0
    if (ts.toDate) return ts.toDate().getTime()
    if (typeof ts === 'number') return ts
    if (ts.seconds) return ts.seconds * 1000
    const d = new Date(ts)
    return isNaN(d) ? 0 : d.getTime()
  }

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const accountId = await getAccountId()
      if (!accountId) {
        setPeriodTotal(0)
        setDailyAverage(0)
        setPeakTime("N/A")
        setPercentageChange(0)
        setHourlyDistribution([])
        setDefectCounts({ good: 0, cracked: 0, dirty: 0, bad: 0 })
        setLastUpdated(new Date())
        setLoading(false)
        return
      }

      const { start, end } = getPeriodRange()
      const startMs = start.getTime()
      const endMs = end.getTime()

      const eggsRef = collection(db, "eggs")
      const qEggs = query(eggsRef, where("accountId", "==", accountId))
      const snap = await getDocs(qEggs)

      const hourMap = new Map()
      const dateSet = new Set()
      let totals = { good: 0, cracked: 0, dirty: 0, bad: 0 }

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {}
        const ts = data.createdAt || null
        const hour = formatHour(ts)
        const date = formatDate(ts)
        const t = getTimestampMillis(ts)
        if (t >= startMs && t <= endMs) {
          dateSet.add(date)
          const quality = (data.quality || '').toString().toLowerCase()
          const cur = hourMap.get(hour) || { hour, good: 0, cracked: 0, dirty: 0, bad: 0, total: 0 }
          if (quality in cur) cur[quality] += 1
          cur.total += 1
          hourMap.set(hour, cur)

          if (quality in totals) totals[quality] += 1
        }
      })

      const hourly = Array.from(hourMap.values()).sort((a,b)=>a.hour.localeCompare(b.hour))
      const totalInspections = Object.values(totals).reduce((a,b)=>a+b,0)
      const uniqueDays = Math.max(dateSet.size, 1)
      const avgPerDay = totalInspections / uniqueDays

      // peak time by total
      let peak = "N/A", peakVal = -1
      hourly.forEach(h => { const t = h.total ?? (h.dirty + h.cracked + h.good + (h.bad||0)); if (t > peakVal) { peakVal = t; peak = h.hour }})

      setHourlyDistribution(hourly)
      setDefectCounts(totals)
      setPeriodTotal(totalInspections)
      setDailyAverage(avgPerDay)
      setPeakTime(peak)
      setPercentageChange(0)
      setLastUpdated(new Date())
    } catch (e) {
      console.error("DailySummary: fetch error", e)
      setError("Failed to load daily summary")
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => { fetchSummary() }

  useEffect(() => { fetchSummary() }, [timeFilter])

  const handleTimeFilterChange = (filter) => setTimeFilter(filter)

  // Format the last updated time
  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : ""

  // Handle refresh button click
  const handleRefresh = () => {
    refreshData()
  }

  // Handle chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type)
  }

  // Handle export format
  const handleExportFormat = (format) => {
    const data = {
      periodTotal,
      dailyAverage,
      peakTime,
      percentageChange,
      hourlyDistribution,
      defectCounts,
      lastUpdated
    }
    
    if (format === 'image') {
      exportToImage(chartRef, `daily-summary-chart-${new Date().toISOString().split('T')[0]}`)
    } else {
      exportDailySummary(data, format)
    }
    setShowExportDropdown(false)
  }

  // Handle outside click for export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium text-gray-800"> Daily Summary</h3>
          <p className="text-gray-500 text-sm">Track defect patterns over time for your linked machines</p>
        </div>
        <div className="flex items-center gap-2 absolute top-6 right-6">
          <div className="relative" ref={exportDropdownRef}>
            <button
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              <Download className="w-5 h-5" />
            </button>
            {showExportDropdown && (
              <div className="absolute top-full mt-2 right-0 border bg-white shadow rounded-lg overflow-hidden z-40 w-40">
                <button
                  onClick={() => handleExportFormat('csv')}
                  className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-green-600">CSV</span>
                </button>
                <button
                  onClick={() => handleExportFormat('excel')}
                  className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-green-600">Excel</span>
                </button>
                <button
                  onClick={() => handleExportFormat('pdf')}
                  className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-red-600">PDF</span>
                </button>
                <button
                  onClick={() => handleExportFormat('docx')}
                  className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-blue-600">DOCX</span>
                </button>
                <button
                  onClick={() => handleExportFormat('image')}
                  className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-purple-600">Image</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Period Total */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm">Period Total</h3>
            <p className="text-4xl font-bold text-blue-600">{loading ? "..." : periodTotal}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs">
                <p className="text-gray-500">Today's defects on your machines</p>
              </div>
              <div className="flex items-center text-xs text-green-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{loading ? "..." : `${percentageChange}% from previous 12h`}</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Daily Average */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm">Daily Average</h3>
            <p className="text-4xl font-bold text-orange-500">{loading ? "..." : dailyAverage.toFixed(1)}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs">
                <p className="text-gray-500">Defects per day on your machines</p>
              </div>
              <div className="flex items-center text-xs opacity-0">
                <span>placeholder</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Peak Time */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm">Peak Time</h3>
            <p className="text-4xl font-bold text-red-500">{loading ? "..." : peakTime}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs">
                <p className="text-gray-500">Highest activity period on your machines</p>
              </div>
              <div className="flex items-center text-xs opacity-0">
                <span>placeholder</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Defect Trends Chart */}
      <div className="border flex flex-col gap-6 rounded-lg p-6" ref={chartRef}>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-gray-800">Defect Trends</h3>
          <p className="text-sm text-gray-500">Daily defect distribution over time on your linked machines</p>
        </div>

        {/* Chart */}
        <div className="flex flex-col gap-2">
          <div className="h-64 border rounded-lg">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-red-500">Error loading chart data</div>
            ) : (
              <DefectChart hourlyDistribution={hourlyDistribution} chartType={chartType} />
            )}
          </div>

          <div className="text-xs text-gray-500 flex items-center justify-end gap-2">
            <Clock className="w-4 h-4" />
            Last updated: {formattedLastUpdated}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <div className="flex items-center gap-2 px-4 py-2 border rounded-full">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <div className="flex items-center justify-between text-sm w-full gap-1">
              <span className="">Good</span>
              <span>({loading ? "..." : defectCounts.good})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border rounded-full">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <div className="flex items-center justify-between text-sm w-full gap-1">
              <span className="">Cracked</span>
              <span>({loading ? "..." : defectCounts.cracked})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border rounded-full">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <div className="flex items-center justify-between text-sm w-full gap-1">
              <span className="">Dirty </span>
              <span>({loading ? "..." : defectCounts.dirty})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border rounded-full">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <div className="flex items-center justify-between text-sm w-full gap-1">
              <span className="">Bad</span>
              <span>({loading ? "..." : defectCounts.bad})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}