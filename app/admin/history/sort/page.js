"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart2, Calendar, Layers, List, ChevronDown } from "lucide-react";
import {
  ArrowUpWideNarrow,
  ChartNoAxesCombined,
  CalendarRange,
  Package,
} from "lucide-react";
import { Navbar } from "../../../components/NavBar";
import { Header } from "../../../components/Header";

import BatchReview from "./components/BatchReview";
import DailySummary from "./components/DailySummary";
import SortLog from "./components/SortLog";
import Statistics from "./components/Statistics";

export default function Sort() {
  const [selectedTab, setSelectedTab] = useState("sortLog");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tab options for the dropdown
  const tabOptions = [
    { name: "Sort Log", value: "sortLog", icon: ArrowUpWideNarrow },
    { name: "Statistics", value: "statistics", icon: ChartNoAxesCombined },
    { name: "Daily Summary", value: "dailySummary", icon: CalendarRange },
    { name: "Batch Review", value: "batchReview", icon: Package },
  ];

  // Get the currently selected tab
  const selectedOption = tabOptions.find(
    (option) => option.value === selectedTab
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

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
            {/* Mobile Dropdown */}
            <div
              ref={dropdownRef}
              className="block md:hidden p-6 border shadow rounded-2xl bg-white relative"
            >
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-4 font-semibold">
                  <selectedOption.icon className="w-5 h-5 text-blue-500" />
                  <div className="flex items-center gap-1">
                    {selectedOption.name}
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-4 border bg-white shadow rounded-2xl overflow-hidden z-40 p-6 flex flex-col gap-6 w-full">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-sm font-medium text-gray-500">
                      View Options
                    </h2>
                    <div className="flex flex-col gap-1">
                      {tabOptions.map(({ name, value, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => {
                            setSelectedTab(value);
                            setDropdownOpen(false);
                          }}
                          className={`px-4 py-3 rounded-lg flex items-center gap-4 transition-colors duration-150
                            ${
                              selectedTab === value
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : "hover:bg-gray-300/20"
                            }`}
                        >
                          <Icon className="w-5 h-5" />
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Tab Buttons */}
            <div className="hidden md:flex text-sm gap-4 justify-center p-6 border shadow rounded-2xl bg-white">
              <button
                className={`px-4 py-3 flex items-center gap-2 rounded-lg border transition-colors duration-150 ${
                  selectedTab === "sortLog"
                    ? "text-white bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                    : "hover:bg-gray-300/20 text-gray-500"
                }`}
                onClick={() => setSelectedTab("sortLog")}
              >
                <ArrowUpWideNarrow className="w-5 h-5" />
                Sort Log
              </button>
              <button
                className={`px-4 py-3 flex items-center gap-2 rounded-lg border transition-colors duration-150 ${
                  selectedTab === "statistics"
                    ? "text-white bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                    : "hover:bg-gray-300/20 text-gray-500"
                }`}
                onClick={() => setSelectedTab("statistics")}
              >
                <ChartNoAxesCombined className="w-5 h-5" />
                Statistics
              </button>
              <button
                className={`px-4 py-3 flex items-center gap-2 rounded-lg border transition-colors duration-150 ${
                  selectedTab === "dailySummary"
                    ? "text-white bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                    : "hover:bg-gray-300/20 text-gray-500"
                }`}
                onClick={() => setSelectedTab("dailySummary")}
              >
                <CalendarRange className="w-5 h-5" />
                Daily Summary
              </button>
              <button
                className={`px-4 py-3 flex items-center gap-2 rounded-lg border transition-colors duration-150 ${
                  selectedTab === "batchReview"
                    ? "text-white bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                    : "hover:bg-gray-300/20 text-gray-500"
                }`}
                onClick={() => setSelectedTab("batchReview")}
              >
                <Package className="w-5 h-5" />
                Batch Review
              </button>
            </div>

            {/* main content - conditional rendering based on selected tab */}
            <div className="border shadow rounded-2xl bg-white">
              {selectedTab === "sortLog" && <SortLog />}
              {selectedTab === "statistics" && <Statistics />}
              {selectedTab === "dailySummary" && <DailySummary />}
              {selectedTab === "batchReview" && <BatchReview />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
