"use client"

import { useEffect, useRef, forwardRef } from "react"

export const SortChart = forwardRef(({ hourlyDistribution, chartType = "bar" }, ref) => {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!hourlyDistribution || hourlyDistribution.length === 0) return

    const canvas = chartRef.current
    const ctx = canvas.getContext("2d")

    // Clear previous chart
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set dimensions
    const width = canvas.width
    const height = canvas.height
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Find max value for scaling (sum when total missing)
    const maxValue = Math.max(
      ...hourlyDistribution.map((item) => {
        if (typeof item.total === 'number') return item.total
        const s = item.Small || 0
        const m = item.Medium || 0
        const l = item.Large || 0
        return s + m + l
      })
    )
    const scale = chartHeight / (maxValue || 1)

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = "#e5e7eb"
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Y-axis labels
    ctx.fillStyle = "#6b7280"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"

    const yAxisSteps = 5
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = Math.round((maxValue / yAxisSteps) * i)
      const y = height - padding - value * scale

      ctx.fillText(value.toString(), padding - 5, y + 3)

      ctx.beginPath()
      ctx.strokeStyle = "#e5e7eb"
      ctx.setLineDash([2, 2])
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Only hours with any data
    const filteredData = hourlyDistribution.filter((item) => {
      const t = typeof item.total === 'number' ? item.total : ((item.Small||0)+(item.Medium||0)+(item.Large||0))
      return t > 0
    })

    const barWidth = chartWidth / (filteredData.length || 1)

    if (chartType === "bar") {
      // Stacked bars: Small (blue), Medium (green), Large (yellow)
      filteredData.forEach((item, index) => {
        const x = padding + index * barWidth
        let yBottom = height - padding

        const segments = [
          { key: 'Small', color: '#3b82f6' },
          { key: 'Medium', color: '#22c55e' },
          { key: 'Large', color: '#eab308' },
        ]

        segments.forEach(seg => {
          const value = item[seg.key] || 0
          if (value > 0) {
            const barHeight = value * scale
            ctx.fillStyle = seg.color
            ctx.fillRect(x + barWidth * 0.2, yBottom - barHeight, barWidth * 0.6, barHeight)
            yBottom -= barHeight
          }
        })

        // X label
        ctx.fillStyle = "#6b7280"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(item.hour, x + barWidth / 2, height - padding + 15)
      })
    } else {
      // Lines for each size
      const lines = [
        { key: 'Small', color: '#3b82f6' },
        { key: 'Medium', color: '#22c55e' },
        { key: 'Large', color: '#eab308' },
      ]

      lines.forEach(line => {
        ctx.beginPath()
        ctx.strokeStyle = line.color
        ctx.lineWidth = 2
        filteredData.forEach((item, index) => {
          const x = padding + index * barWidth + barWidth / 2
          const y = height - padding - (item[line.key] || 0) * scale
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      })

      filteredData.forEach((item, index) => {
        const x = padding + index * barWidth + barWidth / 2
        ctx.fillStyle = "#6b7280"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(item.hour, x, height - padding + 15)
      })
    }
  }, [hourlyDistribution, chartType])

  return <canvas ref={ref || chartRef} width={600} height={300} className="w-full h-full" />
})

SortChart.displayName = 'SortChart'
