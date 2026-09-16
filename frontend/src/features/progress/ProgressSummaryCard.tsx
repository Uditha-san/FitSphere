import React from 'react'
import {
  Scale,
  Percent,
  Calendar,
  Activity,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react'
import type { ProgressLatestSummary } from '../../types/progress'

interface ProgressSummaryCardProps {
  summary: ProgressLatestSummary | null
  clientName?: string
}

export const ProgressSummaryCard: React.FC<ProgressSummaryCardProps> = ({
  summary,
  clientName,
}) => {
  if (!summary || summary.total_records === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">No progress records logged yet{clientName ? ` for ${clientName}` : ''}.</p>
        <p className="text-xs text-slate-500 mt-1">Measurements and body metrics will appear here once recorded.</p>
      </div>
    )
  }

  const latest = summary.latest_record
  const weightChange = summary.weight_change_kg !== null && summary.weight_change_kg !== undefined
    ? Number(summary.weight_change_kg)
    : null
  const bodyFatChange = summary.body_fat_change_percentage !== null && summary.body_fat_change_percentage !== undefined
    ? Number(summary.body_fat_change_percentage)
    : null

  const renderDelta = (delta: number | null, unit: string) => {
    if (delta === null) return <span className="text-slate-500 text-xs">—</span>
    if (delta === 0) {
      return (
        <span className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
          <Minus className="h-3 w-3" /> 0 {unit}
        </span>
      )
    }
    const isNegative = delta < 0
    return (
      <span
        className={`flex items-center gap-1 text-xs font-semibold ${
          isNegative ? 'text-emerald-400' : 'text-amber-400'
        }`}
      >
        {isNegative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {unit}
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Latest Weight */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Current Weight</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Scale className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            {latest?.weight_kg !== undefined && latest?.weight_kg !== null
              ? `${Number(latest.weight_kg).toFixed(1)}`
              : '—'}
          </span>
          <span className="text-slate-400 text-sm font-medium">kg</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500">Overall Change</span>
          {renderDelta(weightChange, 'kg')}
        </div>
      </div>

      {/* Card 2: Body Fat % */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Body Fat</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Percent className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            {latest?.body_fat_percentage !== undefined && latest?.body_fat_percentage !== null
              ? `${Number(latest.body_fat_percentage).toFixed(1)}`
              : '—'}
          </span>
          <span className="text-slate-400 text-sm font-medium">%</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500">Overall Change</span>
          {renderDelta(bodyFatChange, '%')}
        </div>
      </div>

      {/* Card 3: Total Assessments */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Check-Ins</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{summary.total_records}</span>
          <span className="text-slate-400 text-sm font-medium">logged</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500">Consistency</span>
          <span className="text-xs font-semibold text-indigo-400">
            {summary.total_records > 3 ? 'High' : 'Active'}
          </span>
        </div>
      </div>

      {/* Card 4: Last Recorded Date */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Last Check-In</span>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-white truncate">
            {latest?.recorded_at
              ? new Date(latest.recorded_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <span className="text-[11px] text-slate-500">First recorded</span>
          <span className="text-xs font-medium text-slate-400">
            {summary.first_recorded_at
              ? new Date(summary.first_recorded_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
export default ProgressSummaryCard
