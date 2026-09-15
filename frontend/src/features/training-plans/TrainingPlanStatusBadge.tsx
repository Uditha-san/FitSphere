import React from 'react'
import { Sparkles, CheckCircle2, Archive, Clock } from 'lucide-react'
import type { PlanStatus } from '../../types/trainingPlan'

interface TrainingPlanStatusBadgeProps {
  status: PlanStatus | string
}

export const TrainingPlanStatusBadge: React.FC<TrainingPlanStatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase()

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    )
  }

  if (normalized === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="h-3 w-3" />
        Draft
      </span>
    )
  }

  if (normalized === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Sparkles className="h-3 w-3" />
        Completed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-700/50">
      <Archive className="h-3 w-3" />
      Archived
    </span>
  )
}

export default TrainingPlanStatusBadge
