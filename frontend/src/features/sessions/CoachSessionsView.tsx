import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sessionApi } from '../../services/sessionApi'
import { assignmentApi } from '../../services/assignmentApi'
import type { TrainingSession } from '../../types/session'
import type { CoachClientAssignment } from '../../types/assignment'
import SessionCard from './SessionCard'
import CreateSessionModal from './CreateSessionModal'
import SessionDetailsModal from './SessionDetailsModal'

export const CoachSessionsView: React.FC = () => {
  const { user, token } = useAuth()

  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [assignments, setAssignments] = useState<CoachClientAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming')
  const [selectedClientId, setSelectedClientId] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!token || !user) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await sessionApi.listSessions(
        {
          coach_id: user.id,
          client_id: selectedClientId !== 'all' ? selectedClientId : undefined,
        },
        token
      )
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [token, user, selectedClientId])

  const fetchAssignments = useCallback(async () => {
    if (!token || !user) return
    try {
      const data = await assignmentApi.listAssignments(
        { coach_id: user.id, is_active: true },
        token
      )
      setAssignments(data)
    } catch (err) {
      console.error('Failed to load coach assignments', err)
    }
  }, [token, user])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Quick Action Handlers
  const handleConfirm = async (session: TrainingSession) => {
    if (!token) return
    try {
      await sessionApi.confirmSession(session.id, token)
      fetchSessions()
    } catch (err: any) {
      alert(err.message || 'Failed to confirm session.')
    }
  }

  const handleStart = async (session: TrainingSession) => {
    if (!token) return
    try {
      await sessionApi.startSession(session.id, token)
      fetchSessions()
    } catch (err: any) {
      alert(err.message || 'Failed to start session.')
    }
  }

  const handleComplete = async (session: TrainingSession) => {
    if (!token) return
    try {
      await sessionApi.completeSession(session.id, token)
      fetchSessions()
    } catch (err: any) {
      alert(err.message || 'Failed to complete session.')
    }
  }

  // Filtered sessions based on active tab
  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'upcoming') {
      return ['scheduled', 'confirmed', 'in_progress'].includes(s.status)
    }
    if (activeTab === 'completed') {
      return ['completed', 'cancelled', 'no_show'].includes(s.status)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Schedule & Sessions
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Coach Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal training schedule, track appointments, and log workout progress with athletes.
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
            <span>Book Training Session</span>
          </button>
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Past & Completed
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Sessions ({sessions.length})
          </button>
        </div>

        {/* Client Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">Athlete:</span>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Assigned Athletes</option>
            {assignments.map((a) => (
              <option key={a.client_id} value={a.client_id}>
                {a.client?.full_name || a.client?.email || a.client_id}
              </option>
            ))}
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
          <p className="text-xs font-medium">Loading scheduled sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        /* Empty State */
        <div className="py-16 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Sessions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'You have no upcoming sessions scheduled. Click "Book Training Session" to set up a new workout appointment with an athlete.'
              : 'No session history found for the selected filter.'}
          </p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Book Training Session</span>
            </button>
          )}
        </div>
      ) : (
        /* Sessions Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onSelect={setSelectedSession}
              onConfirm={handleConfirm}
              onStart={handleStart}
              onComplete={handleComplete}
              canManage={true}
              role="coach"
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

export default CoachSessionsView
