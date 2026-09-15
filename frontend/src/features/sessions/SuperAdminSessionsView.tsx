import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sessionApi } from '../../services/sessionApi'
import { assignmentApi } from '../../services/assignmentApi'
import type { TrainingSession } from '../../types/session'
import type { Tenant } from '../../types/assignment'
import SessionCard from './SessionCard'
import SessionDetailsModal from './SessionDetailsModal'

export const SuperAdminSessionsView: React.FC = () => {
  const { token } = useAuth()

  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Modal
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)

  const fetchTenants = useCallback(async () => {
    if (!token) return
    try {
      const data = await assignmentApi.listTenants(token)
      setTenants(data)
    } catch (err) {
      console.error('Failed to fetch tenants', err)
    }
  }, [token])

  const fetchSessions = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const filter: any = {}
      if (selectedTenantId !== 'all') filter.tenant_id = selectedTenantId
      if (selectedStatus !== 'all') filter.status = selectedStatus

      const data = await sessionApi.listSessions(filter, token)
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedTenantId, selectedStatus])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Platform Session Audit
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global training session audit across all tenant gyms on the FitSphere platform.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          disabled={isLoading}
          title="Refresh schedule"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Filter by Tenant Facility
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Gym Tenants (Platform-wide)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Filter by Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          <p className="text-xs font-medium">Auditing platform sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty State */
        <div className="py-16 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Sessions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No training sessions match your selected filter criteria across the platform.
          </p>
        </div>
      ) : (
        /* Sessions Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onSelect={setSelectedSession}
              canManage={true}
              role="super_admin"
            />
          ))}
        </div>
      )}

      {/* Details Modal */}
      <SessionDetailsModal
        session={selectedSession}
        isOpen={selectedSession !== null}
        onClose={() => setSelectedSession(null)}
        onUpdateSuccess={fetchSessions}
        canManage={true}
      />
    </div>
  )
}

export default SuperAdminSessionsView
