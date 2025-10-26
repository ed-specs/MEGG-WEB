"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Package,
} from "lucide-react";
import { exportSortLogs } from "../../../../utils/export-utils";
import { db, auth } from "../../../../config/firebaseConfig";
import { getDocs, collection, query, where, doc, getDoc } from "firebase/firestore";

// Function to get color based on size type
const getSizeColor = (size) => {
  switch (size) {
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

export default function SortLog() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const rowsDropdownRef = useRef(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [size, setSize] = useState("All Types");
  const [date, setDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("All Batches");
  const [sortBy, setSortBy] = useState("Newest First");

  // Data state
  const [weightLogs, setWeightLogs] = useState([]);
  const [filteredAndSortedLogs, setFilteredAndSortedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchOptions, setBatchOptions] = useState(["All Batches"]);
  const [sizeOptions, setSizeOptions] = useState(["All Types"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);
  const tableRef = useRef(null);

  // Helper: format timestamp to date and time strings
  const formatTimestamp = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()));
      const date = d.toISOString().slice(0, 10);
      const time = d.toTimeString().slice(0, 8);
      return { date, time };
    } catch {
      const d = new Date();
      return { date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,8) };
    }
  };

  // Helper: get current user's accountId
  const getCurrentAccountId = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data()?.accountId || null) : null;
  };

  // Helper: fetch sort logs from eggs collection
  const fetchSortLogsFromEggs = async () => {
    const accountId = await getCurrentAccountId();
    if (!accountId) return { logs: [], batches: [], sizes: [] };
    const eggsRef = collection(db, "eggs");
    const qEggs = query(eggsRef, where("accountId", "==", accountId));
    const snapshot = await getDocs(qEggs);

    const allLogs = [];
    const batchNumbers = new Set();
    const sizeSet = new Set();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const batchNumber = data.batchId || docSnap.id;
      const ts = data.createdAt || null;
      const { date, time } = formatTimestamp(ts);
      const sizeRaw = (data.size || "").toString().trim().toLowerCase();
      const sizeMap = { small: "Small", medium: "Medium", large: "Large", defect: "Defect", bad: "Defect" };
      const size = sizeMap[sizeRaw] || (sizeRaw ? (sizeRaw.charAt(0).toUpperCase() + sizeRaw.slice(1)) : "");
      const weight = Number(data.weight || 0);
      const eggId = data.eggId || docSnap.id;

      batchNumbers.add(batchNumber);
      if (["Small","Medium","Large","Defect"].includes(size)) sizeSet.add(size);

      allLogs.push({ eggId, batchNumber, timestamp: date, time, size, weight, machineId: accountId });
    });

    return { logs: allLogs, batches: Array.from(batchNumbers), sizes: Array.from(sizeSet) };
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        console.log("SortLog: Starting to fetch initial data...");

        // Fetch sort logs from eggs for the current user's account
        const { logs, batches, sizes } = await fetchSortLogsFromEggs();
        console.log("SortLog: Fetched logs:", logs.length, "items");
        setWeightLogs(logs);

        // Build filters from fetched data
        setBatchOptions(["All Batches", ...batches]);
        setSizeOptions(["All Types", ...sizes]);

        setLoading(false);
        console.log("SortLog: Initial data fetch completed successfully");
      } catch (error) {
        console.error("SortLog: Error fetching initial data:", error);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    const applyFiltersAndSort = async () => {
      try {
        // Client-side filter from loaded logs
        let filteredLogs = [...weightLogs];
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filteredLogs = filteredLogs.filter(l =>
            l.batchNumber.toLowerCase().includes(q) || l.size.toLowerCase().includes(q)
          );
        }
        if (size !== "All Types") {
          filteredLogs = filteredLogs.filter(l => l.size === size);
        }
        if (batchNumber !== "All Batches") {
          filteredLogs = filteredLogs.filter(l => l.batchNumber === batchNumber);
        }
        if (date) {
          filteredLogs = filteredLogs.filter(l => l.timestamp === date);
        }

        const sortedLogs = sortLogs(filteredLogs, sortBy);
        setFilteredAndSortedLogs(sortedLogs);
      } catch (error) {
        console.error("SortLog: Error applying filters:", error);
      }
    };

    applyFiltersAndSort();
  }, [weightLogs, searchQuery, size, date, batchNumber, sortBy]);

  // Sort logs based on selected option
  const sortLogs = (logs, sortOption) => {
    return [...logs].sort((a, b) => {
      switch (sortOption) {
        case "Newest First":
          // Sort by timestamp and time (newest first)
          return a.timestamp === b.timestamp ? b.time.localeCompare(a.time) : b.timestamp.localeCompare(a.timestamp);

        case "Oldest First":
          // Sort by timestamp and time (oldest first)
          return a.timestamp === b.timestamp ? a.time.localeCompare(b.time) : a.timestamp.localeCompare(a.timestamp);

        case "Weight: High to Low":
          // Sort by weight (high to low)
          return b.weight - a.weight;

        case "Weight: Low to High":
          // Sort by weight (low to high)
          return a.weight - b.weight;

        default:
          return 0;
      }
    });
  };

  // Reset to first page when search query or filters change
  useEffect(() => {
    if (
      searchQuery !== "" ||
      size !== "All Types" ||
      date !== "" ||
      batchNumber !== "All Batches" ||
      sortBy !== "Newest First"
    ) {
      setCurrentPage(1);
    }
  }, [searchQuery, size, date, batchNumber, sortBy]);

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      // Fetch fresh data from eggs
      const { logs, batches, sizes } = await fetchSortLogsFromEggs();
      setWeightLogs(logs);
      setBatchOptions(["All Batches", ...batches]);
      setSizeOptions(["All Types", ...sizes]);

      // Reset filters
      setSearchQuery("");
      setSize("All Types");
      setDate("");
      setBatchNumber("All Batches");
      setSortBy("Newest First");
      setCurrentPage(1);

      setIsRefreshing(false);
    } catch (error) {
      console.error("SortLog: Error refreshing data:", error);
      setIsRefreshing(false);
    }
  };

  // Total pages calculation based on filtered logs
  const totalPages = Math.ceil(filteredAndSortedLogs.length / rowsPerPage);

  // Get current page data from filtered logs
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredAndSortedLogs.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Handle outside click for rows dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        rowsDropdownRef.current &&
        !rowsDropdownRef.current.contains(event.target)
      ) {
        setShowRowsDropdown(false);
      }
    }

    if (showRowsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRowsDropdown]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    }

    if (showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle export format
  const handleExportFormat = async (format) => {
    try {
      setIsExporting(true);
      // Use the filtered and sorted logs
      const logsWithData = filteredAndSortedLogs.map(log => ({
        timestamp: log.timestamp,
        batch_id: log.batchNumber,
        weight: log.weight,
        size: log.size,
        machine_id: log.machineId
      }));
      
      await exportSortLogs(logsWithData, format);
      setShowExportDropdown(false);
      
      // Show success message
      if (format === 'pdf' || format === 'docx') {
        alert(`Export completed! Note: Due to browser security restrictions, images may not be embedded in ${format.toUpperCase()} files. Image URLs are included in the export data.`);
      }
    } catch (error) {
      console.error('SortLog: Error exporting weight logs:', error);
      alert('Export failed. Please try again or contact support if the issue persists.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium">Sort Logs</h3>
          <p className="text-gray-500 text-sm">View and analyze weight sorting results from your linked machines</p>
        </div>
        <button
          className={`text-gray-500 hover:text-gray-700 absolute top-6 right-6 ${isRefreshing ? "animate-spin" : ""}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by size..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative md:static px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 w-full"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className="relative" ref={exportDropdownRef}>
              <button
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? "Exporting..." : "Export"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showExportDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showExportDropdown && (
                <div className="absolute top-full mt-2 right-0 border bg-white shadow rounded-lg overflow-hidden z-40 w-40">
                  <button
                    onClick={() => handleExportFormat('csv')}
                    disabled={isExporting}
                    className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-green-600">CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportFormat('excel')}
                    disabled={isExporting}
                    className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-green-600">Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportFormat('pdf')}
                    disabled={isExporting}
                    className="px-4 py-2 text-sm w-full text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-red-600">PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-300/20 transition-all duration-150">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Size Type
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sizeOptions.map((sizeOption, index) => (
                  <option key={index}>{sizeOption}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Batch Number
              </label>
              <select
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {batchOptions.map((batch, index) => (
                  <option key={index}>{batch}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>Newest First</option>
                <option>Oldest First</option>
                <option>Weight: High to Low</option>
                <option>Weight: Low to High</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Size Legend */}
      <div className="flex flex-wrap gap-2">
        {sizeOptions.filter(option => option !== "All Types").map((sizeOption) => {
          const count = weightLogs.filter((log) => log.size === sizeOption).length;
          const bgColor = sizeOption === "Small" ? "bg-blue-500" :
                         sizeOption === "Medium" ? "bg-green-500" :
                         sizeOption === "Large" ? "bg-yellow-500" :
                         sizeOption === "Defect" ? "bg-red-500" : "bg-gray-500";
          
          return (
            <div key={sizeOption} className="flex items-center gap-2 px-4 py-2 border rounded-full">
              <span className={`w-3 h-3 rounded-full ${bgColor}`}></span>
              <div className="flex items-center justify-between text-sm w-full gap-1">
                <span className="">{sizeOption}</span>
                <span>({count})</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4" ref={tableRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RefreshCw className="w-12 h-12 mb-4 text-gray-300 animate-spin" />
            <p className="text-lg font-medium">Loading data...</p>
          </div>
        ) : filteredAndSortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Search className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No sort logs found</p>
            <p className="text-sm">
              {weightLogs.length === 0 
                ? "No weight logs available for your linked machines. Make sure you have machines linked to your account."
                : "Try adjusting your search query or filters"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentItems.map((log, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 rounded-lg border transition-colors duration-150 hover:bg-gray-300/20 p-4"
              >
                {/* title and date */}
                <div className="flex items-center">
                  <div className="flex flex-1 flex-col gap-1">
                    <h3 className="font-medium">
                      {searchQuery ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: (`EGG-${(log.eggId || "").toString()}`).replace(
                              new RegExp(searchQuery, "gi"),
                              (match) => `<span class=\"bg-yellow-200\">${match}</span>`
                            ),
                          }}
                        />
                      ) : (
                        `EGG-${log.eggId}`
                      )}
                    </h3>
                    <span className="text-gray-500 text-xs flex items-center gap-2">
                      {log.batchNumber}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                {/* Size with dynamic color */}
                <div className="flex flex-col gap-1">
                  <h3
                    className={`text-3xl font-bold ${getSizeColor(
                      log.size
                    )}`}
                  >
                    {searchQuery ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: log.size.replace(
                            new RegExp(searchQuery, "gi"),
                            (match) =>
                              `<span class="bg-yellow-200">${match}</span>`
                          ),
                        }}
                      />
                    ) : (
                      log.size
                    )}
                  </h3>
                </div>

                {/* Weight */}
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  Weight:
                  <span className="text-green-500 flex gap-2 text-sm items-center">
                    {log.weight}g
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* pagination - only show if there are results */}
        {filteredAndSortedLogs.length > 0 && (
          <div className="flex items-center justify-between py-2">
            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-sm border rounded-lg px-4 py-2 bg-blue-50 text-blue-600">
                {currentPage}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rows per page selector - moved to the right */}
            <div className="relative" ref={rowsDropdownRef}>
              <button
                onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                className="text-sm border rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
              >
                {rowsPerPage} per page
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showRowsDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showRowsDropdown && (
                <div className="absolute bottom-full mb-2 border bg-white shadow rounded-lg overflow-hidden z-40">
                  {[6, 9, 12, 15].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRowsPerPage(value);
                        setShowRowsDropdown(false);
                        setCurrentPage(1); // Reset to first page when changing rows per page
                      }}
                      className={`px-4 py-2 text-sm w-full text-left hover:bg-gray-50 ${
                        rowsPerPage === value ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
