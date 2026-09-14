import React, { useState, useEffect, useCallback } from 'react'
import { User as UserIcon, RefreshCw, AlertCircle, Loader2, Calendar, Mail, Award, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment } from '../../types/assignment'
import AssignmentStatusBadge from './components/AssignmentStatusBadge'

export const ClientAssignmentView: React.FC = () => {
  const { token } = useAuth()
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientAssignments = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      // Backend automatically filters to current_user.id for clients
      const data = await assignmentApiService.listAssignments({}, token)
      setAssignments(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load coach information')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchClientAssignments()
  }, [fetchClientAssignments])

  const activeAssignment = assignments.find((a) => a.is_active) || assignments[0]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <UserIcon className="h-3.5 w-3.5" />
            Client Portal
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Assigned Coach</h2>
          <p className="text-xs text-slate-400 mt-1">
            View your dedicated personal trainer and assignment details.
          </p>
        </div>

        <button
          onClick={fetchClientAssignments}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <span>Connecting to your coaching profile...</span>
        </div>
      ) : !activeAssignment ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
            <UserIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-white">No Coach Assigned Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You do not have an active coach assigned. Your gym administrator will pair you
              with a dedicated certified coach soon.
            </p>
          </div>
          <div className="pt-2 text-xs text-slate-500">
            Need immediate assistance? Speak to the front desk at your gym facility.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Coach Profile Card */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
                  {activeAssignment.coach?.full_name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {activeAssignment.coach?.full_name || 'Assigned Coach'}
                    </h3>
                    <AssignmentStatusBadge isActive={activeAssignment.is_active} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{activeAssignment.coach?.email || activeAssignment.coach_id}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium pt-1">
                    <Award className="h-3.5 w-3.5" />
                    Certified Gym Personal Trainer
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="text-slate-400 font-medium">Assignment Timeline</div>
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  <span>
                    Assigned on{' '}
                    {new Date(activeAssignment.created_at).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  Ref: {activeAssignment.id}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Your coach creates, manages, and reviews your personalized training routines.
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Direct communication and workout assignments will appear automatically here.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientAssignmentView
