import React from 'react'
import { BarChart3 } from 'lucide-react'

interface EmptyReportStateProps {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyReportState: React.FC<EmptyReportStateProps> = ({
  title = 'No Report Data Available',
  message = 'There are no records matching your selected reporting criteria or timeframe.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
