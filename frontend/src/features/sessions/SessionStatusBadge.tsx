import React from 'react'
import {
  Clock,
  CheckCircle2,
  Play,
  Sparkles,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import type { SessionStatus } from '../../types/session'

interface SessionStatusBadgeProps {
  status: SessionStatus | string
}

export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase()

  switch (normalized) {
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Clock className="h-3 w-3" />
          Scheduled
        </span>
      )

    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Confirmed
        </span>
      )

    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
          <Play className="h-3 w-3 fill-amber-400" />
          In Progress
        </span>
      )

    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Sparkles className="h-3 w-3" />
          Completed
        </span>
      )

    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-700/50">
          <XCircle className="h-3 w-3" />
          Cancelled
        </span>
      )

    case 'no_show':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3" />
          No Show
        </span>
      )

    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
          {status}
        </span>
      )
  }
}

export default SessionStatusBadge
