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
            <EggCharts />
            
            
          </div>
        </div>
      </div>
    </div>
  );
}
