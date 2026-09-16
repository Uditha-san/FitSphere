import React, { useState, useEffect } from 'react'
import {
  Plus,
  Users,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react'
import { progressApi } from '../../services/progressApi'
import { assignmentApi } from '../../services/assignmentApi'
import { useAuth } from '../../context/AuthContext'
import type { ProgressRecord, ProgressLatestSummary } from '../../types/progress'
import type { User } from '../../types/auth'
import ProgressSummaryCard from './ProgressSummaryCard'
import ProgressMeasurementsTable from './ProgressMeasurementsTable'
import ProgressRecordCard from './ProgressRecordCard'
import CreateProgressRecordModal from './CreateProgressRecordModal'
import EditProgressRecordModal from './EditProgressRecordModal'

export const CoachProgressView: React.FC = () => {
  const { token } = useAuth()
  const [clients, setClients] = useState<User[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [summary, setSummary] = useState<ProgressLatestSummary | null>(null)

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null)

  // 1. Fetch Coach's assigned clients
  useEffect(() => {
    if (!token) return

    let cancelled = false
    assignmentApi
      .listAssignments({}, token)
      .then((assignments) => {
        if (!cancelled) {
          const clientUsers = assignments
            .map((a) => a.client)
            .filter((c): c is User => c !== null && c !== undefined)
          setClients(clientUsers)
          if (clientUsers.length > 0 && !selectedClientId) {
            setSelectedClientId(clientUsers[0].id)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load assigned clients.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // 2. Fetch records and summary for the coach / selected client
  const loadData = async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      if (selectedClientId) {
        // Fetch specific client's history and summary
        const [clientRecords, clientSummary] = await Promise.all([
          progressApi.getClientHistory(selectedClientId, {}, token),
          progressApi.getClientSummary(selectedClientId, token),
        ])
        setRecords(clientRecords)
        setSummary(clientSummary)
      } else {
        // Fetch all records for this coach
        const allRecords = await progressApi.listProgressRecords({}, token)
        setRecords(allRecords)
        setSummary(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, selectedClientId])

  const handleDelete = async (record: ProgressRecord) => {
    if (!window.confirm('Are you sure you want to delete this progress check-in?')) return
    if (!token) return

    try {
      await progressApi.deleteProgressRecord(record.id, token)
      setRecords((prev) => prev.filter((r) => r.id !== record.id))
      // Refresh summary
      if (selectedClientId) {
        progressApi.getClientSummary(selectedClientId, token).then(setSummary).catch(() => {})
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.')
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  return (
    <div className="space-y-6">
      {/* Top Bar: Title, Client Selector, View Toggle, Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            Client Progress Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor client body composition, circumference milestones, and notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All My Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.email}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Log Progress Button */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={clients.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Log Check-In</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards if Client is Selected */}
      {selectedClientId && (
        <ProgressSummaryCard
          summary={summary}
          clientName={selectedClient?.full_name || selectedClient?.email}
        />
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
          <p className="text-sm">Loading progress records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
          <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Progress Records Logged</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {selectedClientId
              ? 'No check-ins have been recorded for this client yet. Record baseline measurements to get started.'
              : 'You have not logged any client check-ins yet. Click the button above to log your first record.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={clients.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Log Progress Check-In</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <ProgressMeasurementsTable
          records={records}
          showClientColumn={!selectedClientId}
          canManage={true}
          onEdit={(rec) => setEditingRecord(rec)}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <ProgressRecordCard
              key={rec.id}
              record={rec}
              canManage={true}
              showClient={!selectedClientId}
              onEdit={(r) => setEditingRecord(r)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && token && (
        <CreateProgressRecordModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          token={token}
          clients={clients}
          preselectedClientId={selectedClientId}
          onSuccess={(newRec) => {
            setRecords((prev) => [newRec, ...prev])
            if (selectedClientId) {
              progressApi.getClientSummary(selectedClientId, token).then(setSummary).catch(() => {})
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {editingRecord && token && (
        <EditProgressRecordModal
          isOpen={Boolean(editingRecord)}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          token={token}
          onSuccess={(updatedRec) => {
            setRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)))
            if (selectedClientId) {
              progressApi.getClientSummary(selectedClientId, token).then(setSummary).catch(() => {})
            }
          }}
        />
      )}
    </div>
  )
}
export default CoachProgressView
