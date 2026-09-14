import React, { useState, useEffect, useCallback } from 'react'
import { Dumbbell, RefreshCw, UserCheck, AlertCircle, Loader2, Calendar, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment } from '../../types/assignment'
import AssignmentStatusBadge from './components/AssignmentStatusBadge'

export const CoachAssignmentView: React.FC = () => {
  const { token } = useAuth()
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCoachAssignments = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      // Backend automatically scopes to current_user.id for coaches
      const data = await assignmentApiService.listAssignments({}, token)
      setAssignments(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned clients')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCoachAssignments()
  }, [fetchCoachAssignments])

  const activeCount = assignments.filter((a) => a.is_active).length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Dumbbell className="h-3.5 w-3.5" />
            Coach Workspace
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Assigned Athletes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Athletes and clients assigned to you by your gym administration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            Active Roster: <span className="font-bold text-white">{activeCount}</span>
          </div>
          <button
            onClick={fetchCoachAssignments}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Athletes List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span>Fetching your athlete roster...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-500">
            <Dumbbell className="h-6 w-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-300">No Clients Assigned Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You currently have no clients assigned to your personal training roster. Your gym
            administrator will assign athletes to you here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => {
            const clientName = a.client?.full_name || 'Athlete Client'
            const clientEmail = a.client?.email || a.client_id
            const assignedDate = new Date(a.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4 hover:border-slate-700 transition relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{clientName}</h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        {clientEmail}
                      </span>
                    </div>
                  </div>
                  <AssignmentStatusBadge isActive={a.is_active} size="sm" />
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Assigned: {assignedDate}
                  </span>
                  <span className="font-mono text-slate-500 text-[10px]">
                    ID: {a.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CoachAssignmentView
