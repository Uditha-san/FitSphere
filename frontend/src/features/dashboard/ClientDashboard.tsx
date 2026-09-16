import React, { useState, useEffect, useCallback } from 'react'
import {
  User as UserIcon,
  Award,
  Calendar,
  Mail,
  Dumbbell,
  Clock,
  TrendingUp,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment } from '../../types/assignment'
import AssignmentStatusBadge from '../assignments/components/AssignmentStatusBadge'

interface ClientDashboardProps {
  onNavigate: (section: string) => void
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const { token, user } = useAuth()
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadClientData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await assignmentApiService.listAssignments({}, token)
      setAssignments(data)
    } catch (err) {
      console.error('Failed to load client dashboard', err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadClientData()
  }, [loadClientData])

  const activeAssignment = assignments.find((a) => a.is_active) || assignments[0]

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <UserIcon className="h-3.5 w-3.5" />
            Athlete Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.full_name || 'Athlete'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            View your dedicated coach, review assignment status, and access your fitness journey.
          </p>
        </div>

        <button
          onClick={() => onNavigate('assignments')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 transition cursor-pointer self-start sm:self-auto relative z-10"
        >
          <Award className="h-4 w-4" />
          View Coach Details
        </button>
      </div>

      {/* Coach Card & Program Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dedicated Coach Card */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">My Personal Trainer</h3>
            {activeAssignment && (
              <AssignmentStatusBadge isActive={activeAssignment.is_active} size="sm" />
            )}
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : !activeAssignment ? (
            <div className="py-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <UserIcon className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300">No Coach Assigned Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Visit the gym front desk to pair with a dedicated personal trainer.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
                    {activeAssignment.coach?.full_name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {activeAssignment.coach?.full_name || 'Coach'}
                    </h4>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-cyan-400" />
                      {activeAssignment.coach?.email}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 mt-1">
                      <Award className="h-3 w-3" />
                      Certified Personal Trainer
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800/80 sm:pl-6 text-xs text-slate-400 space-y-1">
                  <div className="text-slate-500 text-[11px]">Training Since</div>
                  <div className="flex items-center gap-1 text-white font-medium">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    {new Date(activeAssignment.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    Your coach manages your customized workout programming.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    Upcoming workout updates and session schedules will appear here.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Teasers */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Upcoming Features</h3>
            <p className="text-xs text-slate-400">
              Your athlete suite is currently expanding with new interactive features:
            </p>

            <div className="space-y-2 pt-2">
              <div
                onClick={() => onNavigate('workouts')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-xs text-white">
                  <Dumbbell className="h-4 w-4 text-cyan-400" />
                  <span>My Training Plans</span>
                </div>
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-medium">
                  Live
                </span>
              </div>

              <div
                onClick={() => onNavigate('schedule')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-xs text-white">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>Schedule & Sessions</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">
                  Live
                </span>
              </div>

              <div
                onClick={() => onNavigate('progress')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-xs text-white">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <span>My Progress & Stats</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-medium">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
