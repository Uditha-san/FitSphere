import React, { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell,
  Users,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Loader2,
  Sparkles,
  Mail,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment } from '../../types/assignment'
import AssignmentStatusBadge from '../assignments/components/AssignmentStatusBadge'

interface CoachDashboardProps {
  onNavigate: (section: string) => void
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ onNavigate }) => {
  const { token, user } = useAuth()
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadCoachData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await assignmentApiService.listAssignments({}, token)
      setAssignments(data)
    } catch (err) {
      console.error('Failed to load coach dashboard', err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadCoachData()
  }, [loadCoachData])

  const activeCount = assignments.filter((a) => a.is_active).length

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Dumbbell className="h-3.5 w-3.5" />
            Coach Workspace
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.full_name || 'Coach'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Track your assigned athletes, review active training pairings, and get ready to manage
            upcoming workout routines.
          </p>
        </div>

        <button
          onClick={() => onNavigate('assignments')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer self-start sm:self-auto relative z-10"
        >
          <Users className="h-4 w-4" />
          Manage Athlete Roster
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Assigned Athletes</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : assignments.length}
          </div>
          <div className="text-[11px] text-slate-500">Clients in your roster</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Training Links</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : activeCount}
          </div>
          <div className="text-[11px] text-emerald-400/90">Currently active pairings</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Training Programs</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">Coming Soon</div>
          <div className="text-[11px] text-slate-500">Next implementation domain</div>
        </div>
      </div>

      {/* Athlete Roster & Training Plans Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster List */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">My Athlete Roster</h3>
              <p className="text-xs text-slate-400">Athletes paired with you for personal training</p>
            </div>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
            >
              Full Roster <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No athletes assigned to your roster yet. Your gym admin will assign athletes to you here.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {a.client?.full_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {a.client?.full_name || 'Client'}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {a.client?.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Assigned {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <AssignmentStatusBadge isActive={a.is_active} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training Plan Teaser */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-emerald-950/30 to-slate-900/60 p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Workouts & Training Plans</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In the next update, you will be able to design custom weekly splits, choose exercises
              from the library, set target sets & reps, and assign workouts to your athletes.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={() => onNavigate('workouts')}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              View Workouts Roadmap <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoachDashboard
