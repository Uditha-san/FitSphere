import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sessionApi } from '../../services/sessionApi'
import { assignmentApi } from '../../services/assignmentApi'
import type { TrainingSession } from '../../types/session'
import type { CoachClientAssignment } from '../../types/assignment'
import SessionCard from './SessionCard'
import CreateSessionModal from './CreateSessionModal'
import SessionDetailsModal from './SessionDetailsModal'

export const GymAdminSessionsView: React.FC = () => {
  const { token } = useAuth()

  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [coachFilter, setCoachFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const filter: any = {}
      if (statusFilter !== 'all') filter.status = statusFilter
      if (coachFilter !== 'all') filter.coach_id = coachFilter
      if (clientFilter !== 'all') filter.client_id = clientFilter

      const data = await sessionApi.listSessions(filter, token)
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch gym sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [token, statusFilter, coachFilter, clientFilter])

  const fetchAssignments = useCallback(async () => {
    if (!token) return
    try {
      const data = await assignmentApi.listAssignments({}, token)
      setAssignments(data)
    } catch (err) {
      console.error('Failed to load assignments', err)
    }
  }, [token])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Extract unique coaches and clients for filters
  const uniqueCoaches = Array.from(
    new Map(
      assignments.map((a) => [a.coach_id, a.coach?.full_name || a.coach?.email || a.coach_id])
    ).entries()
  )

  const uniqueClients = Array.from(
    new Map(
      assignments.map((a) => [a.client_id, a.client?.full_name || a.client?.email || a.client_id])
    ).entries()
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Facility Schedule & Sessions
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Gym Administration
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Facility-wide training session audit, schedule oversight, and personal trainer appointments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSessions}
            disabled={isLoading}
            title="Refresh schedule"
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Coach
          </label>
          <select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Facility Coaches</option>
            {uniqueCoaches.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Athlete
          </label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Athletes</option>
            {uniqueClients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Notification */}
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
          <p className="text-xs font-medium">Loading facility sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty State */
        <div className="py-16 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Sessions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No training sessions match your selected filter criteria within your facility.
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
              role="gym_admin"
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSessions}
      />

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

export default GymAdminSessionsView
