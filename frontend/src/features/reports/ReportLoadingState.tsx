import React from 'react'
import { Loader2 } from 'lucide-react'

export const ReportLoadingState: React.FC<{ message?: string }> = ({
  message = 'Calculating analytics and aggregating report data...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-xs text-slate-400 font-medium">{message}</p>
    </div>
  )
}
