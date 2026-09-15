import React, { useState } from 'react'
import {
  X,
  Calendar,
  Clock,
  Dumbbell,
  CheckCircle2,
  Play,
  Sparkles,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sessionApi } from '../../services/sessionApi'
import type { TrainingSession, SessionType } from '../../types/session'
import SessionStatusBadge from './SessionStatusBadge'

interface SessionDetailsModalProps {
  session: TrainingSession | null
  isOpen: boolean
  onClose: () => void
  onUpdateSuccess: () => void
  canManage?: boolean
}

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  personal_training: '1-on-1 Personal Training',
  group_training: 'Group Training',
  assessment: 'Fitness Assessment',
  consultation: 'Consultation & Goal Setting',
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  session,
  isOpen,
  onClose,
  onUpdateSuccess,
  canManage = false,
}) => {
  const { token } = useAuth()
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !session) return null

  const startDate = new Date(session.scheduled_start)
  const endDate = new Date(session.scheduled_end)

  const dateStr = startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeStr = `${startDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  )

  const handleAction = async (
    actionFn: (id: string, token: string) => Promise<TrainingSession>
  ) => {
    if (!token) return
    setIsActionLoading(true)
    setError(null)
    try {
      await actionFn(session.id, token)
      onUpdateSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Operation failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(session.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <SessionStatusBadge status={session.status} />
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                {SESSION_TYPE_LABELS[session.session_type as SessionType] ||
                  session.session_type}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>{dateStr}</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={isActionLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-slate-500" />
              Scheduled Time
            </span>
            <p className="text-xs font-bold text-white">{timeStr}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-slate-500" />
              Duration
            </span>
            <p className="text-xs font-bold text-white">{durationMinutes} Minutes</p>
          </div>
        </div>

        {/* Participants */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Coach */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Coach / Trainer
            </span>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                {session.coach?.full_name?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {session.coach?.full_name || 'Coach'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {session.coach?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Athlete / Client
            </span>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                {session.client?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {session.client?.full_name || 'Client'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {session.client?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Training Plan */}
        {session.training_plan && (
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 space-y-1.5">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="h-3 w-3" />
              Prescribed Workout Curriculum
            </span>
            <p className="text-xs font-bold text-white">
              {session.training_plan.name}
            </p>
            {session.workout_day && (
              <p className="text-xs text-indigo-300 font-medium">
                Day: {session.workout_day.name}
              </p>
            )}
          </div>
        )}

        {/* Coaching Notes */}
        {session.notes && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Coaching Notes & Prep Instructions
            </span>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">
              {session.notes}
            </p>
          </div>
        )}

        {/* Terminal Message */}
        {isTerminal && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              This session is in terminal status <strong className="text-white uppercase">{session.status}</strong> and locked for audit records.
            </p>
          </div>
        )}

        {/* Management Actions (for Coach or Gym Admin) */}
        {canManage && !isTerminal && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Lifecycle Actions
            </span>

            <div className="grid grid-cols-2 gap-2">
              {session.status === 'scheduled' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleAction(sessionApi.confirmSession.bind(sessionApi))}
                  className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Session</span>
                </button>
              )}

              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleAction(sessionApi.startSession.bind(sessionApi))}
                  className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>Start Session</span>
                </button>
              )}

              {session.status === 'in_progress' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleAction(sessionApi.completeSession.bind(sessionApi))}
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 col-span-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Complete Session</span>
                </button>
              )}

              {(session.status === 'scheduled' || session.status === 'confirmed') && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleAction(sessionApi.markNoShow.bind(sessionApi))}
                  className="px-3 py-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Mark No-Show</span>
                </button>
              )}

              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleAction(sessionApi.cancelSession.bind(sessionApi))}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancel Session</span>
              </button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionDetailsModal
