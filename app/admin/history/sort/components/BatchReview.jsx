"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  Clock8,
  Package,
  Weight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
} from "lucide-react";
import { db, auth } from "../../../../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { exportSortBatchReview } from "../../../../utils/export-utils";

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


export default function BatchReview() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const rowsDropdownRef = useRef(null);

  // Selected batch state
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Data state
  const [batchReviews, setBatchReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);

  // Helpers
  const formatDateTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date()));
      return d.toLocaleString();
    } catch { return new Date().toLocaleString(); }
  };

  const getAccountId = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data()?.accountId || null) : null;
  };

  const pickCount = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === 'number') return v;
    }
    return 0;
  };

  const fetchBatchReviews = async () => {
    setLoading(true);
    try {
      const accountId = await getAccountId();
      if (!accountId) { setBatchReviews([]); setLoading(false); return; }
      const batchesRef = collection(db, "batches");
      const qBatches = query(batchesRef, where("accountId", "==", accountId));
      const snap = await getDocs(qBatches);

      const results = [];
      snap.forEach((d) => {
        const data = d.data() || {};
        const stats = data.stats || {};
        const small = pickCount(stats, ['small', 'smallEggs', 'smallCount']);
        const medium = pickCount(stats, ['medium', 'mediumEggs', 'mediumCount']);
        const large = pickCount(stats, ['large', 'largeEggs', 'largeCount']);
        const goodEggs = typeof stats.goodEggs === 'number' ? stats.goodEggs : (small + medium + large);
        const totalSort = goodEggs;

        const pairs = [
          { key: 'Small', val: small },
          { key: 'Medium', val: medium },
          { key: 'Large', val: large },
        ];
        pairs.sort((a,b)=>b.val-a.val);
        const commonSize = pairs[0].val > 0 ? pairs[0].key : 'Unknown';

        const fromTs = data.createdAt || data.fromDate || null;
        const toTs = data.updatedAt || data.toDate || fromTs;
        const fromDate = formatDateTime(fromTs);
        const toDate = formatDateTime(toTs);

        results.push({
          batchNumber: data.id || d.id,
          fromDate,
          toDate,
          totalSort,
          commonSize,
          timeRange: fromDate && toDate ? `${fromDate} - ${toDate}` : 'N/A',
        });
      });

      setBatchReviews(results);
    } catch (e) {
      console.error('BatchReview (sort): fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch batch reviews data
  useEffect(() => { fetchBatchReviews(); }, []);

  // Total pages calculation
  const totalPages = Math.ceil(batchReviews.length / rowsPerPage);

  // Get current page data
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = batchReviews.slice(indexOfFirstItem, indexOfLastItem);

  // Get overview data based on selected batch or all batches
  const overviewData = selectedBatch
    ? batchReviews.find((batch) => batch.batchNumber === selectedBatch)
    : null;

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

  // Handle outside click for export dropdown
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

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchBatchReviews();
      setSelectedBatch(null);
      setCurrentPage(1);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle export format
  const handleExportFormat = async (format) => {
    try {
      const dataToExport = selectedBatch && overviewData ? overviewData : batchReviews;
      await exportSortBatchReview(dataToExport, format);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('BatchReview: Error exporting batch review:', error);
      alert('Export failed. Please try again or contact support if the issue persists.');
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Handle batch selection
  const handleBatchSelect = (batchNumber) => {
    if (selectedBatch === batchNumber) {
      setSelectedBatch(null); // Deselect if already selected
    } else {
      setSelectedBatch(batchNumber);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-white border p-6 rounded-2xl shadow relative flex-1">
      {/* Header */}
      <div className="flex justify-between items-center ">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-medium">Batch Review</h3>
          <p className="text-gray-500 text-sm">
            View and analyze sort patterns for your linked machines
          </p>
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
              </div>
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* overview */}
        {loading ? (
          <div className="flex items-center flex-col gap-6 justify-center p-6 border rounded-lg">
            <RefreshCw className="w-10 h-10 mx-auto text-gray-300 animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-medium">Loading batch reviews...</h3>
              <p className="text-gray-500 text-sm">
                Fetching data from your linked machines
              </p>
            </div>
          </div>
        ) : selectedBatch ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 border rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-medium text-gray-500 text-sm">
                  Total Sort
                </h3>
                <span className="text-4xl font-semibold text-blue-500">
                  {overviewData?.totalSort || 0}
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-4 border rounded-lg p-4`}>
              <div
                className={`w-10 h-10 ${getSizeTypeBgColor(
                  overviewData?.commonSize || "Unknown"
                )} rounded-full flex items-center justify-center ${getSizeTypeColor(
                  overviewData?.commonSize || "Unknown"
                )}`}
              >
                <Weight className="w-5 h-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-medium text-gray-500 text-sm">
                  Most Common Size
                </h3>
                <span
                  className={`text-4xl font-semibold ${getSizeTypeColor(
                    overviewData?.commonSize || "Unknown"
                  )}`}
                >
                  {overviewData?.commonSize || "Unknown"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 border rounded-lg p-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                <Clock8 className="w-5 h-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-medium text-gray-500 text-sm">
                  Time Range
                </h3>
                <span className="text-lg font-semibold text-yellow-500">
                  {overviewData?.timeRange || "N/A"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center flex-col gap-6 justify-center p-6 border rounded-lg">
            <Package className="w-10 h-10 mx-auto text-gray-500" />
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-medium">
                {batchReviews.length === 0 
                  ? "No batch reviews available" 
                  : "Select a batch to review"
                }
              </h3>
              <p className="text-gray-500 text-sm">
                {batchReviews.length === 0
                  ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
                  : "Click on any batch below to view its details"
                }
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h3 className="font-medium">
            {selectedBatch ? (
              <>
                Selected Batch: {selectedBatch}
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="ml-2 text-sm text-blue-500 hover:text-blue-700"
                >
                  (Clear Selection)
                </button>
              </>
            ) : (
              "Available Batches"
            )}
          </h3>
          {/* batches */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 rounded-lg border p-4 animate-pulse"
                >
                  <div className="flex items-center">
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : currentItems.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-12 text-gray-500">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No batches found</p>
                  <p className="text-sm">
                    {batchReviews.length === 0
                      ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
                      : "No batches match the current page."
                    }
                  </p>
                </div>
              </div>
            ) : (
              currentItems.map((batch, index) => (
                <div
                  key={index}
                  onClick={() => handleBatchSelect(batch.batchNumber)}
                  className={`flex flex-col gap-4 rounded-lg border transition-colors duration-150 hover:bg-gray-300/20 p-4 cursor-pointer ${
                    selectedBatch === batch.batchNumber
                      ? "border-2 border-blue-500"
                      : ""
                  }`}
                >
                  {/* title and date */}
                  <div className="flex items-center">
                    <div className="flex flex-1 flex-col gap-1">
                      <h3 className="font-medium">{batch.batchNumber}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-full bg-blue-500"></div>
                        From
                      </div>
                      <span className="flex gap-2 text-sm items-center">
                        {batch.fromDate}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-full bg-green-500"></div>
                        To
                      </div>
                      <span className="flex gap-2 text-sm items-center">
                        {batch.toDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* pagination - only show if there are results */}
          {!loading && batchReviews.length > 0 && (
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:gap-0 items-center justify-between py-2">
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

              {/* Rows per page selector */}
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
    </div>
  );
}
