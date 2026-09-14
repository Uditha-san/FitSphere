import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface AssignmentStatusBadgeProps {
  isActive: boolean
  size?: 'sm' | 'md'
}

export const AssignmentStatusBadge: React.FC<AssignmentStatusBadgeProps> = ({
  isActive,
  size = 'md',
}) => {
  if (isActive) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <CheckCircle2 className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Active
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <XCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      Inactive
    </span>
  )
}

export default AssignmentStatusBadge
