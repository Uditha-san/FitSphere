import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sessionApi } from '../../services/sessionApi'
import type { TrainingSession } from '../../types/session'
import SessionCard from './SessionCard'
import SessionDetailsModal from './SessionDetailsModal'

export const ClientSessionsView: React.FC = () => {
  const { user, token } = useAuth()

  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!token || !user) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await sessionApi.listSessions({ client_id: user.id }, token)
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const upcomingSessions = sessions.filter((s) =>
    ['scheduled', 'confirmed', 'in_progress'].includes(s.status)
  )

  const pastSessions = sessions.filter((s) =>
    ['completed', 'cancelled', 'no_show'].includes(s.status)
  )

  const displayedSessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              My Training Schedule
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Athlete Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            View your upcoming personal training sessions, appointment times, and coach workout notes.
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

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Upcoming ({upcomingSessions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'past'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Past Sessions ({pastSessions.length})</span>
        </button>
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
          <p className="text-xs font-medium">Loading your schedule...</p>
        </div>
      ) : displayedSessions.length === 0 ? (
        /* Empty State */
        <div className="py-16 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {activeTab === 'upcoming' ? 'No Upcoming Sessions' : 'No Past Sessions'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'You do not have any training sessions scheduled right now. Contact your assigned coach to book your next workout session.'
              : 'You have not completed any training sessions yet.'}
          </p>
        </div>
      ) : (
        /* Sessions Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onSelect={setSelectedSession}
              canManage={false}
              role="client"
            />
          ))}
        </div>
      )}

      {/* Read-Only Details Modal */}
      <SessionDetailsModal
        session={selectedSession}
        isOpen={selectedSession !== null}
        onClose={() => setSelectedSession(null)}
        onUpdateSuccess={fetchSessions}
        canManage={false}
      />
    </div>
  )
}

export default ClientSessionsView
