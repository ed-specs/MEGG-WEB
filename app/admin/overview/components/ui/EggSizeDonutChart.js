"use client"

import { useState, useEffect } from "react"

export function EggSizeDonutChart({ segments = [] }) {
  const [animationProgress, setAnimationProgress] = useState(0)
  const [hoverSegment, setHoverSegment] = useState(null)

  useEffect(() => {
    if (segments.length > 0) {
      const animationDuration = 1000
      const startTime = Date.now()

      const animateChart = () => {
        const elapsedTime = Date.now() - startTime
        const progress = Math.min(elapsedTime / animationDuration, 1)
        setAnimationProgress(progress)

        if (progress < 1) {
          requestAnimationFrame(animateChart)
        }
      }

      requestAnimationFrame(animateChart)
    }
  }, [segments])

  const circleRadius = 40
  const circumference = 2 * Math.PI * circleRadius

  // If no data, show empty donut chart
  const displaySegments = segments.length === 0 
    ? [{ name: "No Data", color: "#e5e7eb", percentage: 100, count: 0, offset: 0 }]
    : segments

  // Calculate offsets for segments
  const segmentsWithOffsets = displaySegments.map((segment, index) => {
    const offset = displaySegments.slice(0, index).reduce((sum, s) => sum + (s.percentage / 100) * circumference, 0)
    return { ...segment, offset }
  })

  const handleMouseEnter = (segment) => {
    setHoverSegment(segment)
  }

  const handleMouseLeave = () => {
    setHoverSegment(null)
  }

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          {segmentsWithOffsets.map((segment, index) => (
            <linearGradient key={index} id={`gradient${index + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={segment.color} />
              <stop offset="100%" stopColor={segment.color} stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>
        {segmentsWithOffsets.map((segment, index) => (
          <circle
            key={index}
            cx="50"
            cy="50"
            r={circleRadius}
            fill="none"
            stroke={`url(#gradient${index + 1})`}
            strokeWidth="12"
            strokeDasharray={`${(segment.percentage / 100) * circumference} ${circumference}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1) 0ms",
              strokeDashoffset: animationProgress * -segment.offset - circumference * (1 - animationProgress),
            }}
            onMouseEnter={() => handleMouseEnter(segment)}
            onMouseLeave={handleMouseLeave}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hoverSegment ? (
          <>
            <span className="text-2xl font-bold text-primary transition-all duration-300 ease-out">
              {hoverSegment.name}
            </span>
            <span className="text-lg font-semibold text-primary/80 transition-all duration-300 ease-out">
              {hoverSegment.percentage}%
            </span>
            <span className="text-sm text-primary/70 transition-all duration-300 ease-out">
              {hoverSegment.count.toLocaleString()} eggs
            </span>
          </>
        ) : (
          <>
            <span
              className="text-3xl font-bold text-primary transition-all duration-700 ease-out"
              style={{
                opacity: animationProgress,
                transform: `scale(${animationProgress})`,
              }}
            >
              100%
            </span>
            <span
              className="text-sm text-primary/70 transition-all duration-700 ease-out"
              style={{
                opacity: animationProgress,
                transform: `translateY(${20 - 20 * animationProgress}px)`,
              }}
            >
              Egg Size Distribution
            </span>
          </>
        )}
      </div>
    </div>
  )
}

