import React from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { ProgressMetricChange } from '../../types/report'

interface ProgressMetricCardProps {
  title: string
  metric: ProgressMetricChange
  unit: string
  invertColors?: boolean // e.g. for weight loss where a decrease is green
}

export const ProgressMetricCard: React.FC<ProgressMetricCardProps> = ({
  title,
  metric,
  unit,
  invertColors = false,
}) => {
  const hasEarliest = metric.earliest_value !== null && metric.earliest_value !== undefined
  const hasLatest = metric.latest_value !== null && metric.latest_value !== undefined
  const hasChange = metric.change !== null && metric.change !== undefined

  const numChange = hasChange ? Number(metric.change) : 0
  const isPositive = numChange > 0
  const isNegative = numChange < 0

  // Color logic
  let changeColor = 'text-slate-400 bg-slate-800/40 border-slate-700'
  let Icon = Minus

  if (hasChange) {
    if (isNegative) {
      Icon = TrendingDown
      changeColor = invertColors
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    } else if (isPositive) {
      Icon = TrendingUp
      changeColor = invertColors
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        {hasChange ? (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${changeColor}`}
          >
            <Icon className="h-3 w-3" />
            <span>
              {numChange > 0 ? `+${numChange}` : numChange} {unit}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 italic">No delta</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Starting</span>
          <div className="text-sm font-bold text-white mt-0.5">
            {hasEarliest ? `${metric.earliest_value} ${unit}` : <span className="text-slate-600">—</span>}
          </div>
          {metric.earliest_date && (
            <span className="text-[10px] text-slate-400">{formatDate(metric.earliest_date)}</span>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Current</span>
          <div className="text-sm font-bold text-white mt-0.5">
            {hasLatest ? `${metric.latest_value} ${unit}` : <span className="text-slate-600">—</span>}
          </div>
          {metric.latest_date && (
            <span className="text-[10px] text-slate-400">{formatDate(metric.latest_date)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
