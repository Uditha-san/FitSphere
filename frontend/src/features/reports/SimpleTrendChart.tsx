import React, { useState } from 'react'

interface DataPoint {
  label: string
  value: number
  secondaryValue?: number
}

interface SimpleTrendChartProps {
  data: DataPoint[]
  title?: string
  color?: string
  unit?: string
  emptyMessage?: string
  height?: number
}

export const SimpleTrendChart: React.FC<SimpleTrendChartProps> = ({
  data,
  title,
  color = '#6366f1',
  unit = '',
  emptyMessage = 'No trend data available for this period',
  height = 180,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
        <p className="text-xs text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  // Calculate scales
  const values = data.map((d) => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal
  const paddingY = 25
  const chartHeight = height - paddingY * 2
  const width = 500
  const paddingX = 35

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((d.value - minVal) / range) * chartHeight
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h4>
          {hoveredIdx !== null && points[hoveredIdx] && (
            <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {points[hoveredIdx].label}: {points[hoveredIdx].value} {unit}
            </span>
          )}
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          style={{ maxHeight: `${height}px` }}
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#1e293b"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#1e293b"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#334155"
          />

          {/* Area under curve */}
          {data.length > 1 && (
            <path d={areaD} fill={`url(#gradient-${color})`} />
          )}

          {/* Main trend line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 5 : 3.5}
                fill={hoveredIdx === i ? '#ffffff' : color}
                stroke={color}
                strokeWidth="2"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-6 pt-1 text-[10px] text-slate-500">
          <span>{data[0]?.label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
          {data.length > 1 && <span>{data[data.length - 1]?.label}</span>}
        </div>
      </div>
    </div>
  )
}
