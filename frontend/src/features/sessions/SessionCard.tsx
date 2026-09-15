import React from 'react'
import {
  Calendar,
  Clock,
  User as UserIcon,
  Dumbbell,
  CheckCircle2,
  Play,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react'
import type { TrainingSession, SessionType } from '../../types/session'
import SessionStatusBadge from './SessionStatusBadge'

interface SessionCardProps {
  session: TrainingSession
  onSelect: (session: TrainingSession) => void
  onConfirm?: (session: TrainingSession) => void
  onStart?: (session: TrainingSession) => void
  onComplete?: (session: TrainingSession) => void
  canManage?: boolean
  role?: string
}

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  personal_training: '1-on-1 PT',
  group_training: 'Group Training',
  assessment: 'Assessment',
  consultation: 'Consultation',
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onSelect,
  onConfirm,
  onStart,
  onComplete,
  canManage = false,
  role = 'coach',
}) => {
  const startDate = new Date(session.scheduled_start)
  const endDate = new Date(session.scheduled_end)

  const dateStr = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const timeStr = `${startDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const sessionTypeLabel =
    SESSION_TYPE_LABELS[session.session_type as SessionType] || session.session_type

  const participantName =
    role === 'client'
      ? session.coach?.full_name || session.coach?.email || 'Your Coach'
      : session.client?.full_name || session.client?.email || 'Client'

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 shadow-md flex flex-col justify-between">
      <div>
        {/* Header: Date, Time & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{timeStr}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <SessionStatusBadge status={session.status} />
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
              {sessionTypeLabel}
            </span>
          </div>
        </div>

        {/* Participant Profile */}
        <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-950/40 border border-slate-800/60 mb-3">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
            {role === 'client' ? <UserCheck className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-medium">
              {role === 'client' ? 'Coach / Trainer' : 'Client / Athlete'}
            </p>
            <p className="text-xs font-semibold text-white truncate">
              {participantName}
            </p>
          </div>
        </div>

        {/* Linked Training Plan or Workout Day */}
        {session.training_plan && (
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-300 text-xs mb-3">
            <Dumbbell className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{session.training_plan.name}</span>
              {session.workout_day && (
                <span className="text-indigo-400/80 text-[11px] block truncate">
                  {session.workout_day.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Coaching Notes Preview */}
        {session.notes && (
          <p className="text-xs text-slate-400 line-clamp-2 italic mb-3">
            "{session.notes}"
          </p>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
        <button
          onClick={() => onSelect(session)}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition cursor-pointer"
        >
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {canManage && (
          <div className="flex items-center gap-1.5">
            {session.status === 'scheduled' && onConfirm && (
              <button
                onClick={() => onConfirm(session)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCircle2 className="h-3 w-3" />
                Confirm
              </button>
            )}

            {(session.status === 'scheduled' || session.status === 'confirmed') && onStart && (
              <button
                onClick={() => onStart(session)}
                className="px-2.5 py-1 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Play className="h-3 w-3 fill-white" />
                Start
              </button>
            )}

            {session.status === 'in_progress' && onComplete && (
              <button
                onClick={() => onComplete(session)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionCard
