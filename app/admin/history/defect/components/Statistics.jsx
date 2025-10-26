"use client"

import { useState, useEffect, useRef } from "react"
import { BarChart2, Clock, RefreshCw, Target, AlertCircle, TrendingUp, ArrowUpRight, Download } from 'lucide-react'
import { exportStatistics, exportToImage } from "../../../../utils/export-utils"
import { db, auth } from "../../../../config/firebaseConfig"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

export default function Statistics() {
  const [timeFilter, setTimeFilter] = useState("24h")
  const [chartType, setChartType] = useState("bar")
  const [loading, setLoading] = useState(true)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef(null)
  const chartRef = useRef(null)
  
  const [stats, setStats] = useState({
    totalInspections: 0,
    defectCounts: {},
    defectPercentages: {},
    mostCommonDefect: null,
    inspectionRate: 0,
    inspectionTrend: 0,
    lastUpdated: "",
  })

  // Fetch statistics when component mounts or time filter changes
  useEffect(() => {
    fetchStatistics()
  }, [timeFilter])

  const getAccountId = async () => {
    const user = auth.currentUser
    if (!user) return null
    const userRef = doc(db, "users", user.uid)
    const snap = await getDoc(userRef)
    return snap.exists() ? (snap.data()?.accountId || null) : null
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

  const getDefectTextColor = (type) => {
    const t = (type || '').toLowerCase()
    if (t === 'good') return 'text-green-500'
    if (t === 'dirty') return 'text-orange-500'
    if (t === 'cracked') return 'text-red-500'
    if (t === 'bad') return 'text-red-600'
    return 'text-gray-800'
  }

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const accountId = await getAccountId()
      if (!accountId) {
        setStats({
          totalInspections: 0,
          defectCounts: {},
          defectPercentages: {},
          mostCommonDefect: null,
          inspectionRate: 0,
          inspectionTrend: 0,
          lastUpdated: new Date().toLocaleTimeString(),
        })
        setLoading(false)
        return
      }

      const { start, end } = getPeriodRange()
      const startMs = start.getTime()
      const endMs = end.getTime()

      const eggsRef = collection(db, "eggs")
      const qEggs = query(eggsRef, where("accountId", "==", accountId))
      const snap = await getDocs(qEggs)

      let counts = { good: 0, cracked: 0, dirty: 0, bad: 0 }
      let totalInspections = 0

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {}
        const ts = data.createdAt || null
        const t = getTimestampMillis(ts)
        if (t >= startMs && t <= endMs) {
          const quality = (data.quality || '').toString().toLowerCase()
          if (quality in counts) counts[quality] += 1
          totalInspections += 1
        }
      })

      // Previous period for trend
      let prevCounts = { good: 0, cracked: 0, dirty: 0, bad: 0 }
      let prevTotal = 0
      const prevStartMs = startMs - (endMs - startMs)
      const prevEndMs = startMs
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {}
        const ts = data.createdAt || null
        const t = getTimestampMillis(ts)
        if (t >= prevStartMs && t < prevEndMs) {
          const quality = (data.quality || '').toString().toLowerCase()
          if (quality in prevCounts) prevCounts[quality] += 1
          prevTotal += 1
        }
      })

      const totalDefects = counts.dirty + counts.cracked + counts.bad
      const percentages = {}
      const types = Object.keys(counts)
      types.forEach((k) => {
        const val = counts[k]
        percentages[k] = totalInspections > 0 ? Math.round((val / totalInspections) * 100) : 0
      })

      const mostCommonDefect = ["good", "cracked", "dirty", "bad"].reduce((acc, k) => {
        return (!acc || counts[k] > counts[acc]) ? k : acc
      }, null)

      const hours = Math.max((endMs - startMs) / (1000 * 60 * 60), 1)
      const inspectionRate = Math.round(totalInspections / hours)
      const inspectionTrend = prevTotal > 0 ? Math.round(((totalInspections - prevTotal) / prevTotal) * 100) : 0

      setStats({
        totalInspections,
        defectCounts: counts,
        defectPercentages: percentages,
        mostCommonDefect: mostCommonDefect ? { type: mostCommonDefect } : null,
        inspectionRate,
        inspectionTrend,
        lastUpdated: new Date().toLocaleTimeString(),
      })
    } catch (error) {
      console.error("Statistics Component: Error fetching machine-linked statistics:", error)
      setStats({
        totalInspections: 0,
        defectCounts: {},
        defectPercentages: {},
        mostCommonDefect: null,
        inspectionRate: 0,
        inspectionTrend: 0,
        lastUpdated: new Date().toLocaleTimeString(),
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle time filter change
  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter)
  }

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStatistics()
  }

  // Handle export format
  const handleExportFormat = (format) => {
    if (format === 'image') {
      exportToImage(chartRef, `statistics-chart-${new Date().toISOString().split('T')[0]}`)
    } else {
      exportStatistics(stats, format)
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

  // Get defect types for chart (ensure fixed order and presence)
  const defectTypes = ["good", "cracked", "dirty", "bad"]

  // Calculate chart heights based on percentages
  const getChartHeight = (defectType) => {
    const percentage = (stats.defectPercentages && stats.defectPercentages[defectType]) || 0
    return `${Math.max(percentage, 5)}%` // Minimum 5% height for visibility
  }

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium"> Statistics</h3>
          <p className="text-gray-500 text-sm">View and analyze defect detection patterns for your linked machines</p>
        </div>
        <div className="flex items-center gap-2 absolute right-6 top-6">
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

      {/* Time filters */}
      <div className="flex flex-col md:flex-row gap-6 justify-between ">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${timeFilter === "24h" ? "bg-blue-500 text-white" : "text-gray-500 border"} text-sm transition-colors duration-150 hover:bg-blue-600 hover:text-white`}
            onClick={() => handleTimeFilterChange("24h")}
          >
            24h
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeFilter === "7d" ? "bg-blue-500 text-white" : "text-gray-500 border"} text-sm transition-colors duration-150 hover:bg-blue-600 hover:text-white`}
            onClick={() => handleTimeFilterChange("7d")}
          >
            7d
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeFilter === "30d" ? "bg-blue-500 text-white" : "text-gray-500 border"} text-sm transition-colors duration-150 hover:bg-blue-600 hover:text-white`}
            onClick={() => handleTimeFilterChange("30d")}
          >
            30d
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeFilter === "90d" ? "bg-blue-500 text-white" : "text-gray-500 border"} text-sm transition-colors duration-150 hover:bg-blue-600 hover:text-white`}
            onClick={() => handleTimeFilterChange("90d")}
          >
            90d
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
          <span className="text-sm text-gray-500">Chart Type:</span>
          <div className="flex items-center gap-2">
            <button
              className={`p-1 rounded ${chartType === "bar" ? "bg-blue-500 text-white" : "text-gray-400 border"} transition-colors duration-150 hover:bg-blue-600 hover:text-white`}
              onClick={() => setChartType("bar")}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inspections */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Total Inspections</h3>
            <p className="text-4xl font-bold text-blue-500">{stats.totalInspections}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs mt-">
                <p className="text-gray-500">Total items inspected on your machines</p>
              </div>
              <div className="flex items-center text-xs text-green-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{stats.inspectionTrend}% from previous period</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Most Common Defect */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Most Common Defect</h3>
            <p className={`text-4xl font-bold ${getDefectTextColor(stats.mostCommonDefect?.type)}`}>
              {stats.mostCommonDefect ? stats.mostCommonDefect.type : "N/A"}
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs mt-">
                <p className="text-gray-500">Highest occurring defect type on your machines</p>
              </div>
              <div className="flex items-center text-xs mt- text-green-500">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                <span>
                  {stats.mostCommonDefect && stats.totalInspections > 0
                    ? `${stats.defectPercentages[stats.mostCommonDefect.type]}% of total`
                    : "0% of total"}
                </span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Inspection Rate */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Inspection Rate</h3>
            <p className="text-4xl font-bold text-yellow-500">{stats.inspectionRate} /hr</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs mt-">
                <p className="text-gray-500">Average items per hour on your machines</p>
              </div>
              <div className="flex items-center text-xs mt- opacity-0">
                <span>placeholder</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Defect Distribution */}
      <div className="flex flex-col gap-4" ref={chartRef}>
        <div className="flex justify-between items-center ">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-gray-800">Defect Distribution</h3>
            <p className="text-sm text-gray-500">Breakdown of defect types and their frequencies on your machines</p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Last updated: {stats.lastUpdated}
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 border rounded-lg">
          <div className="flex h-full items-end">
            {defectTypes.length > 0 ? (
              defectTypes.map((type, index) => {
                // Define colors based on defect type
                let bgColor = "bg-gray-500"
                if (type === "good") bgColor = "bg-green-500"
                else if (type === "dirty") bgColor = "bg-orange-500"
                else if (type === "cracked") bgColor = "bg-red-500"
                else if (type === "bad") bgColor = "bg-red-600"

                return (
                  <div key={type} className="flex flex-col items-center justify-end h-full flex-1">
                    <div className={`w-16 ${bgColor} rounded-t-md`} style={{ height: getChartHeight(type) }}></div>
                    <div className="mt-2 text-xs text-gray-500 -rotate-45 origin-top-left">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No defect data available</p>
                  <p className="text-sm">
                    {stats.totalInspections === 0 
                      ? "No defect logs found for your linked machines in this time period. Make sure you have machines linked to your account."
                      : "No defect types found in the current data."
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {defectTypes.map((type) => {
            // Define colors based on defect type
            let bgColor = "bg-gray-500"
            if (type === "good") bgColor = "bg-green-500"
            else if (type === "dirty") bgColor = "bg-orange-500"
            else if (type === "cracked") bgColor = "bg-red-500"
            else if (type === "bad") bgColor = "bg-red-600"

            return (
              <div key={type} className="flex items-center gap-2 px-4 py-2 border rounded-full">
                <span className={`w-3 h-3 rounded-full ${bgColor}`}></span>
                <div className="flex items-center justify-between text-sm w-full gap-1">
                  <span className="">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span>({stats.defectPercentages[type]}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}