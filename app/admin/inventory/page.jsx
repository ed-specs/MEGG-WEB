"use client";

import { Navbar } from "../../components/NavBar";
import { Header } from "../../components/Header";
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
  QrCode,
} from "lucide-react";


import {getMachineLinkedInventoryData, getMachineLinkedBatchDetails} from "../../lib/inventory/InventoryData";
import QRCode from 'qrcode';

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


export default function InventoryPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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

  // QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        console.log("Inventory: Starting to fetch inventory data...");
        
        // Fetch inventory data only for machines linked to the current user
        const inventoryData = await getMachineLinkedInventoryData();
        console.log("Inventory: Fetched inventory data:", inventoryData.length, "batches");
        setBatchReviews(inventoryData);
        
        setLoading(false);
        console.log("Inventory: Inventory data fetch completed successfully");
      } catch (error) {
        console.error("Inventory: Error fetching inventory data:", error);
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

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

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log("Inventory: Refreshing inventory data...");
      
      // Fetch fresh inventory data only for machines linked to the current user
      const inventoryData = await getMachineLinkedInventoryData();
      setBatchReviews(inventoryData);
      
      // Reset selection and QR code
      setSelectedBatch(null);
      setQrCodeDataUrl(null);
      setCurrentPage(1);
      
      setIsRefreshing(false);
    } catch (error) {
      console.error("Inventory: Error refreshing inventory data:", error);
      setIsRefreshing(false);
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Generate QR Code for selected batch
  const generateQRCode = async (batchNumber) => {
    try {
      setQrCodeLoading(true);
      
      // Create QR code data with batch information
      const qrData = {
        batchNumber: batchNumber,
        timestamp: new Date().toISOString(),
        type: 'inventory_batch',
        url: `${window.location.origin}/inventory/batch/${batchNumber}`
      };

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrCodeDataUrl);
      setQrCodeLoading(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrCodeLoading(false);
    }
  };

  // Download QR Code
  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !selectedBatch) return;

    const link = document.createElement('a');
    link.download = `QR_Code_${selectedBatch}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle batch selection
  const handleBatchSelect = (batchNumber) => {
    if (selectedBatch === batchNumber) {
      setSelectedBatch(null); // Deselect if already selected
      setQrCodeDataUrl(null); // Clear QR code
    } else {
      setSelectedBatch(batchNumber);
      generateQRCode(batchNumber); // Generate QR code for new selection
    }
  };

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            {/* batch review display */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              {loading ? (
                <div className="flex items-center flex-col gap-4 justify-center py-6">
                  <div className="bg-gray-100 rounded-full p-4 ">
                    <RefreshCw className="w-10 h-10 mx-auto text-gray-300 animate-spin" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <h3 className="text-lg font-medium">Loading inventory data...</h3>
                    <p className="text-gray-500 text-sm">
                      Fetching egg batches...
                    </p>
                  </div>
                </div>
              ) : selectedBatch ? (
                <div className="flex flex-col-reverse  xl:flex-row gap-6">
                  {/* left */}
                  <div className="flex flex-1 flex-col gap-6">
                   
                    {/* Main overview cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <h3 className="font-medium text-gray-500 text-sm">
                            Total Eggs
                          </h3>
                          <span className="text-4xl font-semibold text-purple-500">
                            {overviewData?.totalEggs?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>

                      <div className=" col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <h3 className="font-medium text-gray-500 text-sm">
                            Total Sort
                          </h3>
                          <span className="text-4xl font-semibold text-blue-500">
                            {(
                              typeof overviewData?.goodEggs === 'number'
                                ? overviewData.goodEggs
                                : (overviewData?.totalSort || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4`}
                      >
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
                            className={`text-2xl font-semibold ${getSizeTypeColor(
                              overviewData?.commonSize || "Unknown"
                            )}`}
                          >
                            {overviewData?.commonSize || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                          <Clock8 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <h3 className="font-medium text-gray-500 text-sm">
                            Time Range
                          </h3>
                          <span className="text-sm font-semibold text-yellow-500">
                            {overviewData?.timeRange || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Egg Size Distribution */}
                    <div className="">
                      <h4 className="font-medium text-gray-700 mb-4">
                        Egg Size Distribution
                      </h4>
                      <div className="grid grid-cols-4 gap-4">
                        {overviewData?.eggSizes ? Object.entries(overviewData.eggSizes).map(
                          ([size, count]) => (
                            <div
                              key={size}
                              className="col-span-2 md:col-span-1 flex flex-col items-center gap-2"
                            >
                              <div
                                className={`w-12 h-12 ${getSizeTypeBgColor(
                                  size
                                )} rounded-full flex items-center justify-center ${getSizeTypeColor(
                                  size
                                )}`}
                              >
                                <Weight className="w-5 h-5" />
                              </div>
                              <div className="text-center">
                                <div
                                  className={`text-lg font-semibold ${getSizeTypeColor(
                                    size
                                  )}`}
                                >
                                  {count.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {size}
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="col-span-full text-center text-gray-500">
                            No size distribution data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* right */}

                  <div className="flex items-center justify-center xl:items-start xl:justify-start">
                    <div className="bg-white w-auto sm:w-72  rounded-lg">
                      <div className="flex flex-col gap-4">
                        {selectedBatch ? (
                          <div className="flex flex-col gap-4">
                            <div className="aspect-square bg-white border border-gray-200 rounded-lg flex items-center justify-center p-4">
                              {qrCodeLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                                  <span className="text-xs text-gray-500 text-center">
                                    Generating QR Code...
                                  </span>
                                </div>
                              ) : qrCodeDataUrl ? (
                                <div className="flex flex-col items-center gap-2">
                                  <img 
                                    src={qrCodeDataUrl} 
                                    alt={`QR Code for ${selectedBatch}`}
                                    className="w-full h-full object-contain rounded"
                                  />
                                  <span className="text-xs text-gray-500 text-center">
                                    QR Code for
                                    <br />
                                    {selectedBatch}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <QrCode className="w-16 h-16 text-gray-400" />
                                  <span className="text-xs text-gray-500 text-center">
                                    QR Code for
                                    <br />
                                    {selectedBatch}
                                  </span>
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={downloadQRCode}
                              disabled={!qrCodeDataUrl || qrCodeLoading}
                              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {qrCodeLoading ? 'Generating...' : 'Download QR Code'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 py-8">
                            <div className="aspect-square w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                              <QrCode className="w-16 h-16 text-gray-300" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">
                                Select a batch to generate QR code
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-center flex-col gap-4 justify-center py-6">
                  <div className="bg-gray-100 rounded-full p-4 ">
                    <Package className="w-10 h-10 mx-auto text-gray-500" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <h3 className="text-lg font-medium">
                      {batchReviews.length === 0 
                        ? "No inventory data available" 
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
            </div>

            <div className="flex flex-col gap-6 bg-white rounded-2xl border border-gray-300 p-6 shadow">
              {/* batch menus (data) */}
              <div className="flex flex-col gap-4 ">
                <h3 className="font-medium">
                  {selectedBatch ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-gray-500">
                        <span className="font-semibold text-black">
                          {selectedBatch}
                        </span>
                      </span>
                      <button
                        onClick={() => setSelectedBatch(null)}
                        className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
                      >
                        (Clear Selection)
                      </button>
                    </div>
                  ) : (
                    <span className="text-xl font-medium">
                      Available Batches
                    </span>
                  )}
                </h3>

                {/* items */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-4 rounded-lg border border-gray-300 p-4 animate-pulse"
                      >
                        <div className="flex items-center">
                          <div className="flex flex-1 flex-col gap-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
                        className={`flex flex-col gap-4 rounded-lg border  transition-colors duration-150  p-4 cursor-pointer ${
                          selectedBatch === batch.batchNumber
                            ? "border-2 border-blue-500"
                            : "border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        
                        {/* title and date */}
                        <div className="flex items-center">
                          <div className="flex flex-1 flex-col gap-1">
                            <h3 className="font-medium">{batch.batchNumber}</h3>
                            <p className="text-sm text-gray-500">
                              {batch.totalEggs.toLocaleString()} eggs total
                            </p>
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
              </div>

              {/* pagination - only show if there are results */}
              {!loading && batchReviews.length > 0 && (
                <div className="flex flex-col-reverse gap-4 items-center justify-center md:flex-row md:justify-between">
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
                              rowsPerPage === value
                                ? "bg-blue-50 text-blue-600"
                                : ""
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
      </div>
    </div>
  );
}