import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Dumbbell,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Loader2,
  Sparkles,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment } from '../../types/assignment'
import type { User } from '../../types/auth'
import AssignmentStatusBadge from '../assignments/components/AssignmentStatusBadge'
import CreateAssignmentModal from '../assignments/components/CreateAssignmentModal'

interface GymAdminDashboardProps {
  onNavigate: (section: string) => void
}

export const GymAdminDashboard: React.FC<GymAdminDashboardProps> = ({ onNavigate }) => {
  const { token, user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)

  const loadDashboardData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const [fetchedUsers, fetchedAssignments] = await Promise.all([
        assignmentApiService.listUsers({ tenant_id: user?.tenant_id || undefined }, token),
        assignmentApiService.listAssignments({}, token),
      ])
      setUsers(fetchedUsers)
      setAssignments(fetchedAssignments)
    } catch (err) {
      console.error('Failed to load gym dashboard metrics', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, user?.tenant_id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const coachesCount = users.filter((u) => u.role === 'coach' && u.is_active).length
  const clientsCount = users.filter((u) => u.role === 'client' && u.is_active).length
  const activeAssignmentsCount = assignments.filter((a) => a.is_active).length
  const inactiveAssignmentsCount = assignments.filter((a) => !a.is_active).length

  const recentAssignments = assignments.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            Gym Management Overview
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.full_name || 'Gym Administrator'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Monitor real-time gym roster statistics, personal training pairings, and manage your
            facility's fitness ecosystem.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Assign Coach
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Clients</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : clientsCount}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            Registered gym members
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Certified Coaches</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : coachesCount}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            Active personal trainers
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Pairings</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              activeAssignmentsCount
            )}
          </div>
          <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Live training connections
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Inactive/Archived</span>
            <div className="h-8 w-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              inactiveAssignmentsCount
            )}
          </div>
          <div className="text-[11px] text-slate-500">Historical audit records</div>
        </div>
      </div>

      {/* Recent Assignments Table & Roadmap Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Assignments */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Recent Coach-Client Pairings</h3>
              <p className="text-xs text-slate-400">Latest active assignments in your gym roster</p>
            </div>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : recentAssignments.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No assignments found yet. Click 'Assign Coach' to create your first link.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Coach</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">
                          {a.coach?.full_name || 'Coach'}
                        </div>
                        <div className="text-[11px] text-slate-400">{a.coach?.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">
                          {a.client?.full_name || 'Client'}
                        </div>
                        <div className="text-[11px] text-slate-400">{a.client?.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <AssignmentStatusBadge isActive={a.is_active} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Roadmap Preview Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Next Feature: Workouts & Plans</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Soon your coaches will be able to construct comprehensive weekly workout programs,
              assign exercise sets and reps, and track athlete progress directly within FitSphere.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={() => onNavigate('workouts')}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              Preview Workouts Roadmap <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <CreateAssignmentModal
        isOpen={isCreateOpen}
        tenantId={user?.tenant_id}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          loadDashboardData()
        }}
      />
    </div>
  )
}

export default GymAdminDashboard
