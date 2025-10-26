import { useState, useEffect, useRef } from "react";
import {
  BarChart2,
  Clock,
  RefreshCw,
  Target,
  Weight,
  TrendingUp,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { db, auth } from "../../../../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { exportSortStatistics, exportToImage } from "../../../../utils/export-utils";

// Function to get color based on size type
const getSizeTypeColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return "text-blue-500";
    case "Medium":
      return "text-green-500";
    case "Large":
      return "text-yellow-500";
    case "Defect":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
};

// Function to get background color based on size type
const getSizeTypeBgColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return "bg-blue-100";
    case "Medium":
      return "bg-green-100";
    case "Large":
      return "bg-yellow-100";
    case "Defect":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
};

// Function to get icon color based on size type
const getSizeTypeIconColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return "text-blue-500";
    case "Medium":
      return "text-green-500";
    case "Large":
      return "text-yellow-500";
    case "Defect":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
};

export default function Statistics() {
  const [timeFilter, setTimeFilter] = useState("24h");
  const [chartType, setChartType] = useState("bar");
  const [loading, setLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);
  const chartRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalSorts: 0,
    sizeCounts: {},
    sizePercentages: {},
    mostCommonSize: null,
    averageWeight: 0,
    sortRate: 0,
    sortTrend: 0,
    lastUpdated: "",
  });

  // Fetch statistics when component mounts or time filter changes
  useEffect(() => {
    fetchStatistics();
  }, [timeFilter]);

  const getAccountId = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data()?.accountId || null) : null;
  };

  const getPeriodRange = () => {
    const now = new Date();
    const end = now;
    const start = new Date(now);
    if (timeFilter === "24h") start.setHours(start.getHours() - 24);
    else if (timeFilter === "7d") start.setDate(start.getDate() - 7);
    else if (timeFilter === "30d") start.setDate(start.getDate() - 30);
    else if (timeFilter === "90d") start.setDate(start.getDate() - 90);
    return { start, end };
  };

  const getTimestampMillis = (ts) => {
    if (!ts) return 0;
    if (ts.toDate) return ts.toDate().getTime();
    if (typeof ts === 'number') return ts;
    if (ts.seconds) return ts.seconds * 1000;
    const d = new Date(ts);
    return isNaN(d) ? 0 : d.getTime();
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const accountId = await getAccountId();
      if (!accountId) {
        setStats({
          totalSorts: 0,
          sizeCounts: {},
          sizePercentages: {},
          mostCommonSize: null,
          averageWeight: 0,
          sortRate: 0,
          sortTrend: 0,
          lastUpdated: new Date().toLocaleTimeString(),
        });
        return;
      }

      const { start, end } = getPeriodRange();
      const startMs = start.getTime();
      const endMs = end.getTime();

      const eggsRef = collection(db, "eggs");
      const qEggs = query(eggsRef, where("accountId", "==", accountId));
      const snap = await getDocs(qEggs);

      const counts = { Small: 0, Medium: 0, Large: 0 };
      let total = 0;
      let weightSum = 0;
      let hoursInWindow = Math.max((endMs - startMs) / (1000 * 60 * 60), 1);

      snap.forEach((d) => {
        const data = d.data() || {};
        const t = getTimestampMillis(data.createdAt || null);
        if (t >= startMs && t <= endMs) {
          const sizeRaw = (data.size || '').toString().toLowerCase();
          const size = sizeRaw.charAt(0).toUpperCase() + sizeRaw.slice(1);
          if (size in counts) counts[size] += 1;
          total += 1;
          const w = Number(data.weight || 0);
          if (!isNaN(w)) weightSum += w;
        }
      });

      const percentages = Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, total > 0 ? Math.round((v / total) * 100) : 0])
      );
      const most = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))[0] || null;

      setStats({
        totalSorts: total,
        sizeCounts: counts,
        sizePercentages: percentages,
        mostCommonSize: most,
        averageWeight: total > 0 ? Math.round((weightSum / total) * 10) / 10 : 0,
        sortRate: Math.round((total / hoursInWindow) * 10) / 10,
        sortTrend: 0,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      console.error("SortStatistics Component: Error fetching machine-linked sort statistics:", error);
      // Set default values in case of error
      setStats({
        totalSorts: 0,
        sizeCounts: {},
        sizePercentages: {},
        mostCommonSize: null,
        averageWeight: 0,
        sortRate: 0,
        sortTrend: 0,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle time filter change
  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStatistics();
  };

  // Handle export format
  const handleExportFormat = (format) => {
    if (format === 'image') {
      exportToImage(chartRef, `sort-statistics-chart-${new Date().toISOString().split('T')[0]}`);
    } else {
      exportSortStatistics(stats, format);
    }
    setShowExportDropdown(false);
  };

  // Handle outside click for export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get size types for chart
  const sizeTypes = Object.keys(stats.sizeCounts || {});

  // Calculate chart heights based on percentages
  const getChartHeight = (sizeType) => {
    const percentage = stats.sizePercentages[sizeType] || 0;
    return `${Math.max(percentage, 5)}%`; // Minimum 5% height for visibility
  };

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium">Statistics & Analytics</h3>
          <p className="text-gray-500 text-sm">View and analyze sort patterns for your linked machines</p>
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
            <button className="p-1 rounded bg-blue-500 text-white transition-colors duration-150 hover:bg-blue-600">
              <BarChart2 className="w-5 h-5" />
            </button>
            {/* <button className="p-1 rounded text-gray-400 border hover:bg-gray-300/20">
              <Clock className="w-5 h-5" />
            </button> */}
          </div>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sorts */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Total Egg Sort</h3>
            <p className="text-4xl font-bold text-blue-500">{loading ? "..." : stats.totalSorts}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs mt-">
                <p className="text-gray-500">Total items sorted on your machines</p>
              </div>
              <div className="flex items-center text-xs text-green-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{loading ? "..." : `${stats.sortTrend}% from previous period`}</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Most Common Size - with dynamic color */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Most Common Size</h3>
            <p
              className={`text-3xl font-bold ${getSizeTypeColor(
                stats.mostCommonSize ? stats.mostCommonSize.type : "N/A"
              )}`}
            >
              {loading ? "..." : (stats.mostCommonSize ? stats.mostCommonSize.type : "N/A")}
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs mt-">
                <p className="text-gray-500">Highest occurring size on your machines</p>
              </div>
              <div className="flex items-center text-xs mt- text-green-500">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                <span>
                  {stats.mostCommonSize && stats.totalSorts > 0
                    ? `${stats.sizePercentages[stats.mostCommonSize.type]}% of total`
                    : "0% of total"}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`w-10 h-10 ${getSizeTypeBgColor(
              stats.mostCommonSize ? stats.mostCommonSize.type : "N/A"
            )} rounded-full flex items-center justify-center ${getSizeTypeIconColor(
              stats.mostCommonSize ? stats.mostCommonSize.type : "N/A"
            )}`}
          >
            <Weight className="w-5 h-5" />
          </div>
        </div>

        {/* Sort Rate */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm mb-">Sort Rate</h3>
            <p className="text-4xl font-bold text-yellow-500">{loading ? "..." : `${stats.sortRate} /hr`}</p>
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

      {/* Sort Distribution */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-gray-800">Sort Distribution</h3>
            <p className="text-sm text-gray-500">
              Breakdown of egg size and their frequencies from your linked machines
            </p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Last updated: {loading ? "..." : stats.lastUpdated}
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 mt- mb- border rounded-lg" ref={chartRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          ) : sizeTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No sort data available</p>
                <p className="text-sm">
                  {stats.totalSorts === 0
                    ? "No weight logs found for your linked machines in this time period. Make sure you have machines linked to your account."
                    : "No size types found in the current data."
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-end">
              {sizeTypes.map((sizeType) => {
                const bgColor = sizeType === "Small" ? "bg-blue-500" :
                               sizeType === "Medium" ? "bg-green-500" :
                               sizeType === "Large" ? "bg-yellow-500" :
                               sizeType === "Defect" ? "bg-red-500" : "bg-gray-500";
                
                return (
                  <div key={sizeType} className="flex flex-col items-center justify-end h-full flex-1">
                    <div
                      className={`w-16 ${bgColor} rounded-t-md`}
                      style={{ height: getChartHeight(sizeType) }}
                    ></div>
                    <div className="mt-2 text-xs text-gray-500 -rotate-45 origin-top-left">
                      {sizeType}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {sizeTypes.map((sizeType) => {
            const bgColor = sizeType === "Small" ? "bg-blue-500" :
                           sizeType === "Medium" ? "bg-green-500" :
                           sizeType === "Large" ? "bg-yellow-500" :
                           sizeType === "Defect" ? "bg-red-500" : "bg-gray-500";
            
            return (
              <div key={sizeType} className="flex items-center gap-2 px-4 py-2 border rounded-full">
                <span className={`w-3 h-3 rounded-full ${bgColor}`}></span>
                <div className="flex items-center justify-between text-sm w-full gap-1">
                  <span className="">{sizeType}</span>
                  <span>({stats.sizePercentages[sizeType] || 0}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
