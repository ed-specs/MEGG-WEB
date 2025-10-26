"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart2, Calendar, Layers, List, ChevronDown, ArrowUpWideNarrow, ChartNoAxesCombined, CalendarRange, Package } from "lucide-react";

import  { Navbar } from "../../../components/NavBar";
import { Header } from "../../../components/Header";
import BatchReview from "./components/BatchReview";
import DailySummary from "./components/DailySummary";
import DefectLog from "./components/DefectLog";
import Statistics from "./components/Statistics";

export default function Defect() {
  const [selectedTab, setSelectedTab] = useState("defectLog");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tab options for the dropdown
  const tabOptions = [
    { name: "Defect Log", value: "defectLog", icon: List },
    { name: "Statistics", value: "statistics", icon: BarChart2 },
    { name: "Daily Summary", value: "dailySummary", icon: Calendar },
    { name: "Batch Review", value: "batchReview", icon: Layers },
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
      {/* MAIN */}
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header />

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
            <div className="hidden md:flex items-center justify-center gap-4 overflow-x-auto">
              <button
                onClick={() => setSelectedTab("defectLog")}
                className={`px-4 py-2 rounded-full flex items-center gap-2 shrink-0 cursor-pointer transition-colors duration-150 ${
                  selectedTab === "defectLog"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <ArrowUpWideNarrow className="w-5 h-5" />
                Defect Log
              </button>

              <button
                onClick={() => setSelectedTab("statistics")}
                className={`px-4 py-2 rounded-full flex items-center gap-2 shrink-0 cursor-pointer transition-colors duration-150 ${
                  selectedTab === "statistics"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <ChartNoAxesCombined className="w-5 h-5" />
                Statistics
              </button>

              <button
                onClick={() => setSelectedTab("dailySummary")}
                className={`px-4 py-2 rounded-full flex items-center gap-2 shrink-0 cursor-pointer transition-colors duration-150 ${
                  selectedTab === "dailySummary"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <CalendarRange className="w-5 h-5" />
                Daily Summary
              </button>

              <button
                onClick={() => setSelectedTab("batchReview")}
                className={`px-4 py-2 rounded-full flex items-center gap-2 shrink-0 cursor-pointer transition-colors duration-150 ${
                  selectedTab === "batchReview"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <Package className="w-5 h-5" />
                Batch Review
              </button>
            </div>

            {/* main content - conditional rendering based on selected tab */}
            <div className="border shadow rounded-2xl bg-white">
              {selectedTab === "defectLog" && <DefectLog />}
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
