import { useState, useRef, useEffect } from "react";
import {
  BarChart2,
  Clock,
  RefreshCw,
  Target,
  Calendar,
  TrendingUp,
  LineChart,
  Download,
} from "lucide-react";
import { db, auth } from "../../../../config/firebaseConfig";
import { SortChart } from "./SortDailySummarryChart";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import {exportSortDailySummary, exportToImage} from "../../../../utils/export-utils";

export default function DailySummary() {
  const [timeFilter, setTimeFilter] = useState("24h");
  const [chartType, setChartType] = useState("bar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [peakTime, setPeakTime] = useState("N/A");
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [sizeCounts, setSizeCounts] = useState({ Small: 0, Medium: 0, Large: 0 });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);
  const chartRef = useRef(null);

  const handleRefresh = () => { fetchSummary(); };

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

  const formatHour = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()));
      return d.toISOString().slice(11,13) + ":00";
    } catch { return "00:00"; }
  };

  const formatDate = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()));
      return d.toISOString().slice(0,10);
    } catch { return new Date().toISOString().slice(0,10); }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const accountId = await getAccountId();
      if (!accountId) {
        setPeriodTotal(0);
        setDailyAverage(0);
        setPeakTime("N/A");
        setHourlyDistribution([]);
        setSizeCounts({ Small: 0, Medium: 0, Large: 0 });
        setLoading(false);
        return;
      }

      const { start, end } = getPeriodRange();
      const startMs = start.getTime();
      const endMs = end.getTime();

      const eggsRef = collection(db, "eggs");
      const qEggs = query(eggsRef, where("accountId", "==", accountId));
      const snap = await getDocs(qEggs);

      const hourMap = new Map();
      const dateSet = new Set();
      const totals = { Small: 0, Medium: 0, Large: 0 };

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const ts = data.createdAt || null;
        const t = getTimestampMillis(ts);
        if (t >= startMs && t <= endMs) {
          dateSet.add(formatDate(ts));
          const hour = formatHour(ts);
          const sizeRaw = (data.size || '').toString().toLowerCase();
          const size = sizeRaw.charAt(0).toUpperCase() + sizeRaw.slice(1);
          const cur = hourMap.get(hour) || { hour, Small: 0, Medium: 0, Large: 0, total: 0 };
          if (size in cur) cur[size] += 1;
          cur.total += 1;
          hourMap.set(hour, cur);
          if (size in totals) totals[size] += 1;
        }
      });

      const hourly = Array.from(hourMap.values()).sort((a,b)=>a.hour.localeCompare(b.hour));
      const totalInspections = Object.values(totals).reduce((a,b)=>a+b,0);
      const uniqueDays = Math.max(dateSet.size, 1);
      const avgPerDay = totalInspections / uniqueDays;
      let peak = "N/A", peakVal = -1;
      hourly.forEach(h => { const v = h.total; if (v > peakVal) { peakVal = v; peak = h.hour; }});

      setHourlyDistribution(hourly);
      setSizeCounts(totals);
      setPeriodTotal(totalInspections);
      setDailyAverage(avgPerDay);
      setPeakTime(peak);
    } catch (e) {
      console.error("Sort DailySummary: fetch error", e);
      setError("Failed to load sort daily summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [timeFilter]);

  const handleTimeFilterChange = (filter) => setTimeFilter(filter);

  // Handle export format
  const handleExportFormat = (format) => {
    if (format === 'image') {
      exportToImage(chartRef, `sort-daily-summary-chart-${new Date().toISOString().split('T')[0]}`);
    } else {
      const exportData = { periodTotal, dailyAverage, peakTime, hourlyDistribution, sizeCounts };
      exportSortDailySummary(exportData, format);
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

  // Get size types for legend
  const sizeTypes = Object.keys(sizeCounts || {});

  // Calculate chart height based on hourly distribution
  const getChartHeight = (hour) => {
    const item = hourlyDistribution.find(h => h.hour === hour) || { total: 0 };
    const maxCount = Math.max(...hourlyDistribution.map(h => h.total || 0), 1);
    return `${Math.max(((item.total || 0) / maxCount) * 100, 5)}%`; // Minimum 5% height for visibility
  };

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium text-gray-800">Daily Summary</h3>
          <p className="text-gray-500 text-sm">Track sort patterns over time for your linked machines</p>
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

      {/* Chart Type Selection */}
      {/* <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Chart Type:</span>
        <div className="flex items-center gap-2">
          <button 
            className={`p-2 rounded ${chartType === "line" ? "bg-blue-500 text-white" : "text-gray-400 border hover:bg-gray-100"}`}
            onClick={() => setChartType("line")}
          >
            <LineChart className="w-4 h-4" />
          </button>
          <button 
            className={`p-2 rounded ${chartType === "bar" ? "bg-blue-500 text-white" : "text-gray-400 border hover:bg-gray-100"}`}
            onClick={() => setChartType("bar")}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div> */}

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Period Total */}
        <div className="border rounded-lg p-4 flex">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-gray-500 text-sm">Period Total</h3>
            <p className="text-4xl font-bold text-blue-600">{loading ? "..." : periodTotal}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center text-xs">
                <p className="text-gray-500">Today's sorts on your machines</p>
              </div>
              <div className="flex items-center text-xs text-green-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span className="opacity-0">placeholder</span>
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
                <p className="text-gray-500">Sorts per day on your machines</p>
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
                <p className="text-gray-500">Highest activity period today</p>
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

      {/* Sort Trends Chart */}
      <div className="border flex flex-col gap-6 rounded-lg p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-gray-800">Sort Trends</h3>
          <p className="text-sm text-gray-500">
            Hourly sort distribution for today on your linked machines
          </p>
        </div>

        {/* Chart */}
        <div className="flex flex-col gap-2">
          <div className="h-64 border rounded-lg" ref={chartRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
              </div>
            ) : hourlyDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No sort data available</p>
                  <p className="text-sm">
                    {periodTotal === 0
                      ? "No weight logs found for your linked machines today. Make sure you have machines linked to your account."
                      : "No hourly distribution data available."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <SortChart hourlyDistribution={hourlyDistribution} chartType={chartType} />
            )}
          </div>

          <div className="text-xs text-gray-500 flex items-center justify-end gap-2">
            <Clock className="w-4 h-4" />
            Last updated: {loading ? "..." : new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col lg:flex-row gap-4 justify-center">
          {sizeTypes.map((sizeType) => {
            const bgColor = sizeType === "Small" ? "bg-blue-500" :
                           sizeType === "Medium" ? "bg-green-500" :
                           sizeType === "Large" ? "bg-yellow-500" : "bg-gray-500";
            
            const count = sizeCounts?.[sizeType] || 0;
            const percentage = periodTotal > 0 ? Number(((count / (periodTotal || 1)) * 100)).toFixed(1) : 0;
            
            return (
              <div key={sizeType} className="flex items-center gap-2 px-4 py-2 border rounded-full">
                <span className={`w-3 h-3 rounded-full ${bgColor}`}></span>
                <div className="flex items-center justify-between text-sm w-full gap-1">
                  <span className="">{sizeType}</span>
                  <span>({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
