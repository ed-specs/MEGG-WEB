"use client";

import { useState, useEffect } from "react";
import { Blend, Egg, Clock, Target, RefreshCw } from "lucide-react";
import { EggSizeDonutChart } from "./EggSizeDonutChart";
import { StatItem } from "./StatItem";
import {
  getMachineLinkedEggSizeStats,
  getMachineLinkedEggSizeDistribution,
} from "../../../../lib/overview/sizing/EggSizeStats";

export function EggSizeStats({ timeFrame = "daily" }) {
  const [stats, setStats] = useState({
    totalEggs: 0,
    totalAllEggs: 0,
    avgEggsPerHour: 0,
    totalDefects: 0,
    mostCommonSize: "None",
  });
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, segmentsData] = await Promise.all([
          getMachineLinkedEggSizeStats(timeFrame),
          getMachineLinkedEggSizeDistribution(timeFrame),
        ]);

        setStats(statsData);

        // Check if there's any data at all
        const totalCount = segmentsData.reduce(
          (sum, segment) => sum + segment.count,
          0
        );

        if (totalCount > 0) {
          setSegments(segmentsData);
          setHasData(true);
        } else {
          setSegments([]);
          setHasData(false);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching machine-linked egg size stats:", err);
        setError("Failed to load egg size statistics for your linked machines");
        setLoading(false);
      }
    };

    fetchData();
  }, [timeFrame]);

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex flex-col gap-4 bg-gray-100 p-6 rounded-2xl border h-96 w-full max-w-md flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
        </div>
        <div className="grid grid-cols-2 gap-6 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="col-span-2 xl:col-span-2 bg-gray-100 p-6 rounded-2xl h-32 flex items-center justify-center"
            >
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  // Stat card data for the right grid
  const statItems = [
    {
      title: "Total Eggs",
      value: (stats.totalAllEggs || 0).toLocaleString(),
      icon: Egg,
      bgColor: "from-purple-500 to-purple-600",
      paddingColor: "bg-purple-400",
    },
    {
      title: "Total Eggs Sorted",
      value: stats.totalEggs.toLocaleString(),
      icon: Target,
      bgColor: "from-blue-500 to-blue-600",
      paddingColor: "bg-blue-400",
    },

    {
      title: "Avg Eggs /min",
      value: stats.eggsPerMinute,
      icon: Clock,
      bgColor: "from-green-400 to-green-500",
      paddingColor: "bg-green-300",
    },
    {
      title: "Most Common Size",
      value: stats.mostCommonSize,
      icon: Blend,
      bgColor: "from-yellow-400 to-yellow-500",
      paddingColor: "bg-yellow-300",
    },
  ];
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Egg Distribution Doughnut Chart Placeholder */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-gray-300 shadow w-full max-w-md">
        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-medium">Egg Size Distribution</h3>
        </div>

        <div className="md:size-72 mx-auto">
          <EggSizeDonutChart segments={segments} />
        </div>

        <div className="flex flex-col gap-2">
          {segments.length > 0 ? (
            segments.map((segment, idx) => (
              <StatItem
                key={idx}
                label={segment.name}
                value={`${segment.percentage}%`}
                color={segment.color}
              />
            ))
          ) : (
            <StatItem label="No Data" value="0%" color="#e5e7eb" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full ">
        {statItems.map(
          ({ title, value, icon: Icon, bgColor, paddingColor }) => (
            <div
              key={title}
              className={`col-span-2 xl:col-span-2 bg-gradient-to-l ${bgColor} text-white p-6 rounded-2xl shadow flex items-center justify-between gap-4 xl:gap-8`}
            >
              <div
                className={`flex items-center justify-center p-2 rounded-full ${paddingColor}`}
              >
                <Icon className="w-12 h-12 xl:w-10 xl:h-10 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 text-end ">
                <h3 className="text-3xl font-semibold">{value}</h3>
                <span className="text-gray-50 text-sm">{title}</span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
