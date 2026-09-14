import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Loader2,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment, Tenant } from '../../types/assignment'
import type { User } from '../../types/auth'

interface SuperAdminDashboardProps {
  onNavigate: (section: string) => void
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const { token } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadPlatformMetrics = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const [fetchedTenants, fetchedUsers, fetchedAssignments] = await Promise.all([
        assignmentApiService.listTenants(token),
        assignmentApiService.listUsers({}, token),
        assignmentApiService.listAssignments({}, token),
      ])
      setTenants(fetchedTenants)
      setUsers(fetchedUsers)
      setAssignments(fetchedAssignments)
    } catch (err) {
      console.error('Failed to load super admin metrics', err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadPlatformMetrics()
  }, [loadPlatformMetrics])

  const activeAssignments = assignments.filter((a) => a.is_active).length

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Super Admin
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Platform Command Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Global governance over multi-tenant gym installations, cross-gym accounts, and
            infrastructure diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('assignments')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Users className="h-4 w-4" />
            Manage Assignments
          </button>
          <button
            onClick={() => onNavigate('dev')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
          >
            <Terminal className="h-4 w-4 text-indigo-400" />
            Developer Tools
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Registered Gym Tenants</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : tenants.length}
          </div>
          <div className="text-[11px] text-slate-500">Isolated database tenants</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Platform Users</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : users.length}
          </div>
          <div className="text-[11px] text-slate-500">Across all roles & gyms</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Coach-Client Pairings</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              activeAssignments
            )}
          </div>
          <div className="text-[11px] text-emerald-400/90">Global active links</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Registered Gym Tenants</h3>
            <p className="text-xs text-slate-400">Multi-tenant instances configured in PostgreSQL</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No gym tenants registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Gym Name</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Tenant UUID</th>
                  <th className="py-2.5 px-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition">
                    <td className="py-3 px-3 font-semibold text-white">{t.name}</td>
                    <td className="py-3 px-3 font-mono text-purple-400">{t.slug}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{t.id}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard
