import React from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle, CalendarCheck } from 'lucide-react'
import type { SessionStatistics } from '../../types/report'

interface SessionStatisticsCardProps {
  stats: SessionStatistics
  title?: string
  subtitle?: string
}

export const SessionStatisticsCard: React.FC<SessionStatisticsCardProps> = ({
  stats,
  title = 'Session Performance & Completion',
  subtitle = 'Overview of scheduled training sessions and attendance outcomes',
}) => {
  // SVG Donut calculation
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (stats.completion_rate / 100) * circumference

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-indigo-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Completion Ring Gauge */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="#1e293b"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke={stats.completion_rate >= 80 ? '#10b981' : stats.completion_rate >= 50 ? '#6366f1' : '#f59e0b'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-extrabold text-white tracking-tight">
                {stats.completion_rate}%
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Completion
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 max-w-[200px]">
            {stats.eligible_outcome > 0
              ? `${stats.completed} of ${stats.eligible_outcome} final-outcome sessions completed`
              : 'No completed or cancelled sessions yet'}
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
            <div className="text-xl font-extrabold text-white mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500">All sessions</span>
          </div>

          {/* Completed */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Done
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">{stats.completed}</div>
            <span className="text-[10px] text-slate-500">Attended</span>
          </div>

          {/* Cancelled */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400">
              <XCircle className="h-3 w-3" /> Cancelled
            </div>
            <div className="text-xl font-extrabold text-rose-400 mt-1">{stats.cancelled}</div>
            <span className="text-[10px] text-slate-500">Cancelled</span>
          </div>

          {/* Upcoming */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              <Clock className="h-3 w-3" /> Upcoming
            </div>
            <div className="text-xl font-extrabold text-indigo-400 mt-1">{stats.scheduled}</div>
            <span className="text-[10px] text-slate-500">Scheduled</span>
          </div>

          {/* No Show if > 0 */}
          {stats.no_show > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 col-span-2 sm:col-span-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" /> Missed / No-Show Sessions
              </div>
              <span className="text-sm font-bold text-amber-400">{stats.no_show}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
