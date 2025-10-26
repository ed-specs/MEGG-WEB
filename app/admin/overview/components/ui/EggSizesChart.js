"use client"

import { useState, useRef, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { getMachineLinkedDailyEggSizes, getMachineLinkedMonthlyEggSizes } from "../../../../lib/overview/sizing/EggSizesChart"

export function EggSizesChart({ timeFrame }) {
  const [hoverData, setHoverData] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const chartRef = useRef(null)
  const [chartDimensions, setChartDimensions] = useState({
    width: 0,
    height: 0,
  })
  const maxEggs = data.length > 0 
    ? Math.max(1, ...data.map((d) => (d.large || 0) + (d.medium || 0) + (d.small || 0) + (d.defect || 0)))
    : 1

  const colors = {
    large: "#b0b0b0",
    medium: "#fb510f",
    small: "#ecb662",
    defect: "#dc2626",
  }

  const sizes = ["small", "medium", "large", "defect"]

  // Fetch data when timeFrame changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsVisible(false)

        let fetchedData = []
        if (timeFrame === "daily") {
          fetchedData = await getMachineLinkedDailyEggSizes()
        } else {
          fetchedData = await getMachineLinkedMonthlyEggSizes()
        }

        // If no data, provide empty data structure
        if (fetchedData.length === 0) {
          const emptyData = timeFrame === "daily" 
            ? [
                { day: "Mon", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Tue", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Wed", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Thu", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Fri", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Sat", large: 0, medium: 0, small: 0, defect: 0 },
                { day: "Sun", large: 0, medium: 0, small: 0, defect: 0 }
              ]
            : [
                { month: "Jan", large: 0, medium: 0, small: 0, defect: 0 },
                { month: "Feb", large: 0, medium: 0, small: 0, defect: 0 },
                { month: "Mar", large: 0, medium: 0, small: 0, defect: 0 },
                { month: "Apr", large: 0, medium: 0, small: 0, defect: 0 },
                { month: "May", large: 0, medium: 0, small: 0, defect: 0 },
                { month: "Jun", large: 0, medium: 0, small: 0, defect: 0 }
              ]
          setData(emptyData)
        } else {
          setData(fetchedData)
        }
        setLoading(false)

        // Small delay before animation starts
        setTimeout(() => setIsVisible(true), 100)
      } catch (err) {
        console.error("Error fetching egg sizes data:", err)
        setError("Failed to load egg sizes data for your linked machines")
        setLoading(false)
      }
    }

    fetchData()
  }, [timeFrame])

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const { width, height } = chartRef.current.getBoundingClientRect()
        setChartDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  const handleMouseMove = (event, d) => {
    if (!chartRef.current) return
    
    const svgRect = chartRef.current.getBoundingClientRect()
    const x = event.clientX - svgRect.left
    const y = event.clientY - svgRect.top

    setHoverData({
      x,
      y,
      label: timeFrame === "daily" ? d.day : d.month,
      sizes: d,
    })
  }

  const padding = { left: 40, right: 40, top: 20, bottom: 30 }
  const chartWidth = Math.min(
    chartDimensions.width - padding.left - padding.right,
    600
  )
  const chartHeight = chartDimensions.height - padding.top - padding.bottom
  const barWidth = Math.min((chartWidth / data.length) * 0.6, 40)

  const getTooltipPosition = (x, y) => {
    const tooltipWidth = 150
    const tooltipHeight = 150
    const margin = 10

    let left = x
    let top = y - tooltipHeight - margin

    if (left < tooltipWidth / 2 + margin) {
      left = tooltipWidth / 2 + margin
    } else if (left > chartDimensions.width - tooltipWidth / 2 - margin) {
      left = chartDimensions.width - tooltipWidth / 2 - margin
    }

    if (top < margin) {
      top = y + margin
    }

    return { left, top }
  }

  if (loading) {
    return (
      <div className="relative w-full h-[300px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative w-full h-[300px] flex items-center justify-center">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    )
  }


  return (
    <div className="relative w-full h-[300px]" ref={chartRef}>
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * (chartWidth - barWidth)
            let accumulatedHeight = 0

            return (
              <g
                key={i}
                onMouseEnter={(event) => handleMouseMove(event, d)}
                onMouseMove={(event) => handleMouseMove(event, d)}
                onMouseLeave={() => setHoverData(null)}
              >
                {sizes.map((size, sizeIndex) => {
                  const height = ((d[size] || 0) / maxEggs) * chartHeight
                  const y = chartHeight - accumulatedHeight - height
                  accumulatedHeight += height

                  return (
                    <rect
                      key={`${size}-${i}`}
                      x={x}
                      y={y - 0.5}
                      width={barWidth}
                      height={height + 1}
                      fill={colors[size]}
                      className="transition-all ease-in-out"
                      style={{
                        transform: isVisible ? "scaleY(1)" : "scaleY(0)",
                        transformOrigin: "bottom",
                        transitionDuration: "1500ms",
                        transitionDelay: `${i * 150 + sizeIndex * 75}ms`,
                      }}
                    />
                  )
                })}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-current text-blue-600 transition-all ease-in-out"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(10px)",
                    transitionDuration: "1000ms",
                    transitionDelay: `${i * 150 + sizes.length * 75}ms`,
                  }}
                >
                  {timeFrame === "daily" ? d.day : d.month}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      {hoverData && (
        <div
          className="absolute bg-white p-3 rounded-xl shadow-lg text-sm border border-gray-200 transition-all duration-300 ease-in-out"
          style={{
            ...getTooltipPosition(hoverData.x, hoverData.y),
            transform: "translate(-50%, 0)",
            pointerEvents: "none",
            minWidth: "150px",
            opacity: 1,
          }}
        >
          <div className="font-medium text-gray-800 text-sm border-b pb-1 mb-2">
            {hoverData.label}
          </div>
          <div className="space-y-1">
            {sizes
              .slice()
              .reverse()
              .map((size) => (
                <div
                  key={size}
                  className="flex items-center text-gray-700 text-sm"
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2 border border-gray-400"
                    style={{ backgroundColor: colors[size] }}
                  ></span>
                  <span className="capitalize font-medium">{size}:</span>
                  <span className="ml-auto text-black">
                    {(hoverData.sizes[size] || 0).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
