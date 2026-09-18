import React, { useState } from 'react'
import { Calendar, Check } from 'lucide-react'
import type { ReportPeriodType } from '../../types/report'

interface ReportPeriodFilterProps {
  period: ReportPeriodType
  startDate?: string
  endDate?: string
  onChange: (period: ReportPeriodType, startDate?: string, endDate?: string) => void
}

export const ReportPeriodFilter: React.FC<ReportPeriodFilterProps> = ({
  period,
  startDate,
  endDate,
  onChange,
}) => {
  const [customStart, setCustomStart] = useState(startDate ? startDate.slice(0, 10) : '')
  const [customEnd, setCustomEnd] = useState(endDate ? endDate.slice(0, 10) : '')
  const [isCustomOpen, setIsCustomOpen] = useState(period === 'custom')

  const options: { id: ReportPeriodType; label: string }[] = [
    { id: 'last_7_days', label: '7 Days' },
    { id: 'last_30_days', label: '30 Days' },
    { id: 'last_90_days', label: '90 Days' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ]

  const handleSelectPreset = (p: ReportPeriodType) => {
    if (p === 'custom') {
      setIsCustomOpen(true)
      return
    }
    setIsCustomOpen(false)
    onChange(p)
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customStart || !customEnd) return
    const sIso = `${customStart}T00:00:00Z`
    const eIso = `${customEnd}T23:59:59Z`
    onChange('custom', sIso, eIso)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Preset Pills */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        {options.map((opt) => {
          const isActive = period === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => handleSelectPreset(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Custom Range Picker Dropdown / Inputs */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs animate-in fade-in duration-150"
        >
          <Calendar className="h-3.5 w-3.5 text-slate-500 ml-1.5 shrink-0" />
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            required
          />
          <span className="text-slate-600">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            required
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Check className="h-3 w-3" /> Apply
          </button>
        </form>
      )}
    </div>
  )
}
