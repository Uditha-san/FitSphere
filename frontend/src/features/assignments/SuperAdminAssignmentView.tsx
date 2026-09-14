import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Building2,
  RefreshCw,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { assignmentApiService } from '../../services/assignmentApi'
import type { CoachClientAssignment, Tenant } from '../../types/assignment'
import AssignmentStatusBadge from './components/AssignmentStatusBadge'
import CreateAssignmentModal from './components/CreateAssignmentModal'
import DeactivateConfirmModal from './components/DeactivateConfirmModal'

export const SuperAdminAssignmentView: React.FC = () => {
  const { token } = useAuth()
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)
  const [deactivatingAssignment, setDeactivatingAssignment] =
    useState<CoachClientAssignment | null>(null)
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false)

  // Fetch tenants on mount
  useEffect(() => {
    if (!token) return
    const fetchTenants = async () => {
      try {
        const data = await assignmentApiService.listTenants(token)
        setTenants(data)
      } catch (err: any) {
        console.error('Failed to load tenants', err)
      }
    }
    fetchTenants()
  }, [token])

  const fetchAssignments = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const tenantFilter = selectedTenantId === 'all' ? undefined : selectedTenantId
      const data = await assignmentApiService.listAssignments(
        { tenant_id: tenantFilter },
        token
      )
      setAssignments(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load platform assignments')
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedTenantId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const handleDeactivateConfirm = async () => {
    if (!deactivatingAssignment || !token) return
    setIsDeactivating(true)
    try {
      await assignmentApiService.deactivateAssignment(deactivatingAssignment.id, token)
      setSuccessToast('Assignment deactivated successfully across platform')
      setDeactivatingAssignment(null)
      fetchAssignments()
      setTimeout(() => setSuccessToast(null), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate assignment')
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleCreateSuccess = () => {
    setSuccessToast('New platform assignment established successfully')
    fetchAssignments()
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const filteredAssignments = assignments.filter((a) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const coachMatch =
      a.coach?.full_name?.toLowerCase().includes(q) ||
      a.coach?.email.toLowerCase().includes(q) ||
      a.coach_id.toLowerCase().includes(q)
    const clientMatch =
      a.client?.full_name?.toLowerCase().includes(q) ||
      a.client?.email.toLowerCase().includes(q) ||
      a.client_id.toLowerCase().includes(q)
    return coachMatch || clientMatch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Super Admin
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Cross-Tenant Coach Assignments
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global visibility across all gyms, coaches, and client pairings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAssignments}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign Coach
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search coach or client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-purple-400" /> Gym Tenant:
          </span>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Gym Tenants ({tenants.length})</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span>Fetching platform assignments...</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">No Platform Assignments Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select another gym tenant or click 'Assign Coach' to create a new pairing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Gym Tenant ID</th>
                  <th className="px-5 py-3.5">Assigned Coach</th>
                  <th className="px-5 py-3.5">Athlete Client</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Assigned On</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAssignments.map((assignment) => {
                  const coachName = assignment.coach?.full_name || 'Coach'
                  const coachEmail = assignment.coach?.email || assignment.coach_id
                  const clientName = assignment.client?.full_name || 'Client'
                  const clientEmail = assignment.client?.email || assignment.client_id
                  const assignedDate = new Date(assignment.created_at).toLocaleDateString()

                  return (
                    <tr key={assignment.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <span className="font-mono text-purple-300/90 text-xs">
                          {assignment.tenant_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{coachName}</div>
                        <div className="text-slate-400 text-xs font-mono">{coachEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{clientName}</div>
                        <div className="text-slate-400 text-xs font-mono">{clientEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <AssignmentStatusBadge isActive={assignment.is_active} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-slate-400">{assignedDate}</td>
                      <td className="px-5 py-4 text-right">
                        {assignment.is_active ? (
                          <button
                            onClick={() => setDeactivatingAssignment(assignment)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition cursor-pointer"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Deactivated</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={isCreateOpen}
        tenantId={selectedTenantId !== 'all' ? selectedTenantId : tenants[0]?.id}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <DeactivateConfirmModal
        isOpen={!!deactivatingAssignment}
        assignment={deactivatingAssignment}
        isLoading={isDeactivating}
        onClose={() => setDeactivatingAssignment(null)}
        onConfirm={handleDeactivateConfirm}
      />
    </div>
  )
}

export default SuperAdminAssignmentView
