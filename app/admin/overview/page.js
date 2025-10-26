"use client";

import { useState } from "react";
import { MonitorDot, MonitorX, TriangleAlert } from "lucide-react";
import EggCharts from "./components/EggCharts";
import { Navbar } from "../../components/NavBar";
import  { Header } from "../../components/Header";

export default function OverviewPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
            {/* top charts */}
            <EggCharts />
            {/* other essentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* live alerts */}
              <div className="col-span-1 h-80 flex rounded-2xl border border-gray-300 shadow w-full bg-white flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-medium">Live alerts</span>
                  <button className="text-gray-500 transition-colors duration-150 hover:text-blue-500 cursor-pointer text-sm">
                    View all
                  </button>
                </div>
              </div>
              {/* recent alerts */}
              <div className="col-span-1 h-80 flex rounded-2xl border border-gray-300 shadow w-full bg-white flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-medium">Recent events</span>
                  <button className="text-gray-500 transition-colors duration-150 hover:text-blue-500 cursor-pointer text-sm">
                    View all
                  </button>
                </div>
              </div>
              {/* machine status */}
              <div className="col-span-1 md:col-span-2 xl:col-span-1 h-80 flex rounded-2xl border border-gray-300 shadow w-full bg-white flex-col gap-6 p-6 ">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-medium">Machine status</span>
                  <button className="text-gray-500 transition-colors duration-150 hover:text-blue-500 cursor-pointer text-sm">
                    View all
                  </button>
                </div>

                <div className="flex flex-col gap-4 overflow-x-auto">
                  {/* machine status data */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-300 transition-colors duration-150 hover:bg-gray-100 cursor-pointer">
                    <span className="font-medium">Sort A</span>
                    <div className="flex items-center gap-2 text-green-500 animate-pulse">
                      <MonitorDot className="w-4 h-4" />
                      <span className="text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-300 transition-colors duration-150 hover:bg-gray-100 cursor-pointer">
                    <span className="font-medium">Sort B</span>
                    <div className="flex items-center gap-2 text-yellow-500 animate-pulse">
                      <TriangleAlert className="w-4 h-4" />
                      <span className="text-sm">Maintenance</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-300 transition-colors duration-150 hover:bg-gray-100 cursor-pointer">
                    <span className="font-medium">Sort C</span>
                    <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                      <MonitorX className="w-4 h-4" />
                      <span className="text-sm">Offline</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
